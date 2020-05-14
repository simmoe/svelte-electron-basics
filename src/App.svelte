<script>

//context menu
const { remote } = require('electron')
const { Menu, MenuItem } = remote

let info = 'nothing happening'

const menu = new Menu()
menu.append(new MenuItem({ label: 'MenuItem1', click() { info = 'item 1 clicked' } }))
menu.append(new MenuItem({ type: 'separator' }))
menu.append(new MenuItem({ label: 'MenuItem2', click() { info = 'item 2 clicked' } } ))

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  menu.popup({ window: remote.getCurrentWindow() })
}, false)

//notifications
const showNotification = () => {
	let myNotification = new Notification('Hello', {
	body: 'You are now officially part of the system'
	})
	myNotification.onclick = () => {
		console.log('Notification clicked')
	}
}
const amIOnline = () => {
	window.alert(navigator.onLine ? 'you\'re online sirs' : 'you\'re offline')
}

let m = { x: 0, y: 0 }
function handleMousemove(event) {
	m.x = event.clientX;
	m.y = event.clientY;
}


</script>

<svelte:head>
	<title>The Basics</title>
</svelte:head>
<main on:mousemove={handleMousemove}>
	<h1>Svelte-Electron</h1>
	<p>Let's do stuff</p>
	<button on:click={showNotification}>show system notifications</button>
	<button on:click={amIOnline}>Am I online?</button>
	<hr>
	<h5>{info}</h5>
	<h5>The mouse position is {m.x} x {m.y}</h5>
</main>

<style>
	:global(body, html){margin:0;padding:0;}
	:global(*){box-sizing:border-box;}
	main {
		text-align: center;
		padding: 1em;
		height:100vh;
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>