
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.19.1 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let t0;
    	let main;
    	let h1;
    	let t2;
    	let p;
    	let t4;
    	let button0;
    	let t6;
    	let button1;
    	let t8;
    	let hr;
    	let t9;
    	let h50;
    	let t10;
    	let t11;
    	let h51;
    	let t12;
    	let t13_value = /*m*/ ctx[1].x + "";
    	let t13;
    	let t14;
    	let t15_value = /*m*/ ctx[1].y + "";
    	let t15;
    	let dispose;

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Svelte-Electron";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Let's do stuff";
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "show system notifications";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Am I online?";
    			t8 = space();
    			hr = element("hr");
    			t9 = space();
    			h50 = element("h5");
    			t10 = text(/*info*/ ctx[0]);
    			t11 = space();
    			h51 = element("h5");
    			t12 = text("The mouse position is ");
    			t13 = text(t13_value);
    			t14 = text(" x ");
    			t15 = text(t15_value);
    			document.title = "The Basics";
    			attr_dev(h1, "class", "svelte-6klnmj");
    			add_location(h1, file, 44, 1, 1059);
    			add_location(p, file, 45, 1, 1085);
    			add_location(button0, file, 46, 1, 1108);
    			add_location(button1, file, 47, 1, 1180);
    			add_location(hr, file, 48, 1, 1232);
    			add_location(h50, file, 49, 1, 1238);
    			add_location(h51, file, 50, 1, 1255);
    			attr_dev(main, "class", "svelte-6klnmj");
    			add_location(main, file, 43, 0, 1020);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t2);
    			append_dev(main, p);
    			append_dev(main, t4);
    			append_dev(main, button0);
    			append_dev(main, t6);
    			append_dev(main, button1);
    			append_dev(main, t8);
    			append_dev(main, hr);
    			append_dev(main, t9);
    			append_dev(main, h50);
    			append_dev(h50, t10);
    			append_dev(main, t11);
    			append_dev(main, h51);
    			append_dev(h51, t12);
    			append_dev(h51, t13);
    			append_dev(h51, t14);
    			append_dev(h51, t15);

    			dispose = [
    				listen_dev(button0, "click", /*showNotification*/ ctx[2], false, false, false),
    				listen_dev(button1, "click", /*amIOnline*/ ctx[3], false, false, false),
    				listen_dev(main, "mousemove", /*handleMousemove*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*info*/ 1) set_data_dev(t10, /*info*/ ctx[0]);
    			if (dirty & /*m*/ 2 && t13_value !== (t13_value = /*m*/ ctx[1].x + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*m*/ 2 && t15_value !== (t15_value = /*m*/ ctx[1].y + "")) set_data_dev(t15, t15_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const { remote } = require("electron");
    	const { Menu, MenuItem } = remote;
    	let info = "nothing happening";
    	const menu = new Menu();

    	menu.append(new MenuItem({
    			label: "MenuItem1",
    			click() {
    				$$invalidate(0, info = "item 1 clicked");
    			}
    		}));

    	menu.append(new MenuItem({ type: "separator" }));

    	menu.append(new MenuItem({
    			label: "MenuItem2",
    			click() {
    				$$invalidate(0, info = "item 2 clicked");
    			}
    		}));

    	window.addEventListener(
    		"contextmenu",
    		e => {
    			e.preventDefault();
    			menu.popup({ window: remote.getCurrentWindow() });
    		},
    		false
    	);

    	//notifications
    	const showNotification = () => {
    		let myNotification = new Notification("Hello",
    		{
    				body: "You are now officially part of the system"
    			});

    		myNotification.onclick = () => {
    			console.log("Notification clicked");
    		};
    	};

    	const amIOnline = () => {
    		window.alert(navigator.onLine
    		? "you're online sirs"
    		: "you're offline");
    	};

    	let m = { x: 0, y: 0 };

    	function handleMousemove(event) {
    		$$invalidate(1, m.x = event.clientX, m);
    		$$invalidate(1, m.y = event.clientY, m);
    	}

    	$$self.$capture_state = () => ({
    		remote,
    		Menu,
    		MenuItem,
    		info,
    		menu,
    		showNotification,
    		amIOnline,
    		m,
    		handleMousemove,
    		require,
    		window,
    		Notification,
    		console,
    		navigator
    	});

    	$$self.$inject_state = $$props => {
    		if ("info" in $$props) $$invalidate(0, info = $$props.info);
    		if ("m" in $$props) $$invalidate(1, m = $$props.m);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [info, m, showNotification, amIOnline, handleMousemove];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
