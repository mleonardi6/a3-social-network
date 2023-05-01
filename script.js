
const USER_FIELDS = ["name", "uid", "emoji", "color"]
const APP_NAME = "KATESPLANETPALACE"


//==============================================
// Query parameters, useful for adding in variables based on a url
// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
const PARAMS = new Proxy(new URLSearchParams(window.location.search), {
	get: (searchParams, prop) => searchParams.get(prop),
});

console.log(`Mode: '${PARAMS["mode"]}'  Name: '${PARAMS["name"]}'`)


//==============================================

window.onload = function(e) { 

	let authData = {
		uid: undefined
	}

	
	console.log("CONNECTING TO FIREBASE")
	
	// Your web app's Firebase configuration
	// It's ok for this to be public! Its visible in any web page
	const firebaseConfig = {
		apiKey: "AIzaSyDSBaj1KVNUhOkDbSqBbAg2eKoRAr9xfEM",
		authDomain: "cs396-arvr-sp23-social.firebaseapp.com",
		projectId: "cs396-arvr-sp23-social",
		storageBucket: "cs396-arvr-sp23-social.appspot.com",
		messagingSenderId: "126561591561",
		appId: "1:126561591561:web:f6de0cd16b0db9183533d8"
	};

	try {
		// Initialize Firebase
		firebase.initializeApp(firebaseConfig);
		console.log("FIREBASE INIT!")
		
	} catch (err) {
		console.warn("Can't connect to firebase")
	}

	// Create the database
	const db = firebase.database()

	let userList = new UserList(db)

	// Is there an override for uid
	if (PARAMS["uid"] !== null) {
		console.log( PARAMS["uid"])
		authData.uid = PARAMS["uid"]
		userList.addOrGetUser(authData.uid, true)
	} else {
		// Do authentication
		// Ignore if we have a test uid

		firebase.auth().onAuthStateChanged((newAuthData) => {

			if (newAuthData) {
				// User is signed in, see docs for a list of available properties
				// https://firebase.google.com/docs/reference/js/firebase.User
				
				// Save this user ID
				authData.uid = newAuthData.uid;
				console.log("Authenticated anonymously as", authData.uid)
				userList.addOrGetUser(authData.uid)
			} else {
				// User is signed out
				// ...
			}
		});
	}


	// Create a new Vue object
	new Vue({
		template: `

		<!-- DEBUG VIEW -->
			<div id="app" v-if="mode=='debug'"> 
				<!-- user controls -->
				<div  class="section">
					AUTH ID: <span class="uid">{{authData.uid}}</span>

					<div v-if="user">
						<input v-model="user.name" />
					</div>
					<button @click="user.pushChangesToServer()">SAVE</button>
				</div>


				<!-- test message -->
				<div class="section">
					Send a test message
					<input v-model="editMessage.text" @keyup.enter="postEditMessage" />
					<button @click="postEditMessage">send message</button>
				</div>

				<div class="columns">

					<!-- user column -->
					<div class="column">
						
						<table>
							<tr><td>UID</td><td>EMOJI</td><td>NAME</td><td>COLOR</td>
							<tr v-for="user in userList.users">
								<td><span class="uid">{{user.uid}}</span></td>
								<td>{{user.emoji}}</td>
								<td>{{user.name}}</td>
								<td>{{user.color}}</td>
								<td @click="user.remove()">🗑️</td>
							</tr>

						</table>
					</div>

					<!-- message column -->
					<div class="column">
						
						<table>
							<tr><td>FROM</td><td>TO</td><td>TEXT</td><td>DATA</td>
							<tr v-for="message in messages">
								<td><span class="uid">{{message.from}}</span></td>
								<td><span class="uid">{{message.to}}</span></td>
								<td>{{message.text}}</td>
								<td>{{message.data}}</td>
								<td @click="deleteMessage(message)">🗑️</td>
							</tr>

						</table>
					</div>
				</div>

			</div>
		</div>

		<!-- REGULAR VIEW: PLANETS -->
      <div id="app" v-else class="space-app"> 
      

      
      <!-- user divs --> 
      <div v-for="user in userList.users" class="user-planet"> 
         <div class="username">{{user.name}}</div>
      </div>
      
      <div v-for="message in filterMessages" class="message-star" :style="messageStyle(message)"> 
         <div class="">{{message.text}}</div>
         
         <img :src="message.imgURL" />
      </div>
      
      
            
      <!-- posting UI -->
      <div class="post-ui">
        <button @click="makePlanetPost">POST</button>
      </div>
		</div>`,

		computed: {
      
			user() {
				// Get ...my data!
				// Which user has the same ID as us, if logged in?
				return this.userList.getUserByUID(this.authData.uid)
			},
      
      filterMessages() {
        // Which messages do I want?
        let newMessages = this.messages.filter(message => {
          // Return true or false
          if (message.text.length > 0 && message.x !== undefined) {
            console.log(message)
            if ( message.imgURL !== undefined)
                return true
          }
          
        })
        return newMessages
      }
		},

		methods: {
      
      
      messageStyle(message) {
        console.log(message)
        // Use the message data
          return {
            position: "absolute",
            left: message.x + "px",
            top: message.y + "px",
           
          }
      },
      
      makePlanetPost() {
        this.post({
          text: "I'm a planet",
          x: Math.random()*500,
          y: Math.random()*300,
           imgURL: "https://nssdc.gsfc.nasa.gov/planetary/mars/image/mars.gif"
        })
      },
      
			postEditMessage() {
				// Post (then clear) the edited message
				this.post(this.editMessage)
				this.editMessage.text = ""
			},

			post(message) {
				console.log("sendMessage", message)
				// Send if from myself unless I am spoofing
				message.timestamp = Date.now()
				message.app = this.appName	
				message.from = this.authData.uid	
				console.log(`Posted (${message.app}:${message.from}) '${message.text}'`)

				if (message.data) {
					console.log("....with data ", message.data)
				}

				let msgRef = db.ref("messages")
				let newRef = msgRef.push()
				message.uid = newRef.key
				newRef.set(message)
			},

			deleteMessage(msg) {
				// Delete a message
				let ref = db.ref("messages/" + msg.uid)
				ref.set(null)
			},



			subscribeToMessages() {

				// Subscribe to messages
				let msgRef = db.ref("messages")
				msgRef.on("child_added", (snapshot) => {
					let uid = snapshot.key

					let msg = snapshot.val()
					
					// Add this to the list
					this.messages.push(msg)	
				})

				msgRef.on("child_removed", (snapshot) => {
					// Received notice that this message has been removed
					let index = this.messages.findIndex(msg=>msg.uid===snapshot.key)
					console.log("remove message at", index)
					this.messages.splice(index, 1)

				})
			}


		},


		mounted() {

			// Keep this
			this.subscribeToMessages()

			// If we have a p5 element, make a P5 instance
			// let el = document.getElementById('p5-holder')
			
			// if (el) {
			// 	this.p = new p5((p) => {
			// 		// Basic P5 setup and handlers
			// 		p.setup = () => {
			// 			p.createCanvas(el.offsetWidth, el.offsetHeight)
			// 			p.colorMode(p.HSL)
			// 			p.ellipseMode(p.RADIUS)
			// 			p.background(50)
			// 		}

			// 		p.draw = () => {
			// 			p.background(50)
			// 			let t = p.millis()*.001
			// 			p.circle(0, 0, 100)
			// 		}

			// 		p.mouseDragged = () => {}

			// 		p.click = () => {

						
			// 		}

			// 	}, el)

			// }
		},



		// Data for our application
		data: {
			mode: PARAMS["mode"],

			appName: APP_NAME,

			authData: authData,
			userList: userList,
			messages: [],

			editMessage: {
				to: null,
				text: "Hello",
			}
		},

		// Which element Vue controls
		el: "#app",

		
	})

	
}
