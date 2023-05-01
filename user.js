

class User {
	// A user in this system
	constructor({ref, uid}) {
		this.uid = uid
		this.ref = ref
		console.log("made", this.uid)

		this.ref.on("value", (snapshot) => {
			// Handle changes to this user
			let val = snapshot.val()
			
			if (val) {
				USER_FIELDS.forEach(key => Vue.set(this, key,  val[key]))
			}
			else {
				// User was deleted!
			}
			
			
		})

		console.log(this)
	}

	remove() {
		// console.log("Remove user")
		this.ref.set(null)
	}

	toString() {
		return `User(${this.uid.slice(-4)})`
	}

	pushChangesToServer() {
		// Push any changes from this user to the server
		let serverUpdate = {}
		USER_FIELDS.forEach(key => {
			if (this[key] !== undefined)
				serverUpdate[key] = this[key]

		})
		this.ref.update(serverUpdate)
		console.log("UPDATE", serverUpdate)
	}
}

class UserList {
	constructor(db) {
		this.users = []
		this.userRef = db.ref("users")

		this.userRef.on("child_added", (snapshot) => {
			let uid = snapshot.key
			
			// Create a new user object
			let user = new User({
				uid: uid, 
				data:snapshot.val(),
				ref: this.userRef.child(uid)
			})
			// Add this to the list
			this.users.push(user)
			// TODO deleted
		})

		this.userRef.on("child_removed", (snapshot) => {
			// Received notice that this player has been removed
			let uid = snapshot.key
			this.users.splice(this.getIndexOfUser(uid), 1)

		})
	}

	getUserByUID(uid) {
		// Check for users or uids
		return this.users.find(u => u.uid == uid || u == uid)
	}

	getIndexOfUser(uid) {
		// Check for users or uids
		return this.users.findIndex(u => u.uid == uid || u == uid)
	}

	addOrGetUser(uid, fake) {
		// Get the reference to this user
		let ref = this.userRef.child(uid)

		// Create this user if they don't exist already
		ref.once('value').then((snapshot) => {
			let userData = snapshot.val()

			// If they don't exist, create them
			if (!snapshot.exists()) {
				console.log("No user ", uid, "...creating one!")
				ref.set({
					fake: fake||false,
					uid: uid,
					name: "anon",
					emoji: "⬛️"
				})
			}
		})
	}
}

