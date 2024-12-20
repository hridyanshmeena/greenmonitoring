const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// MongoDB connection
const uri = "mongodb+srv://hridyansh:asdpj@hridyansh.geuwbqg.mongodb.net/?retryWrites=true&w=majority&appName=hridyansh";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let usersCollection;


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true, // Prevent access via JavaScript
            secure: false, // Set to true if using HTTPS
            maxAge: 3600000, // 1 hour
        }
    })
);
app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        console.log(req.session.user.name);
      return next(); // Proceed to the next middleware/route handler
    } else {
      res.status(401).send('Unauthorized. Please log in.');
    }
  }

function verifyAuthentication(req, res) {
    if (req.session.isLoggedIn) {
        res.status(200).json({ isAuthenticated: true });
    } else {
        res.status(401).json({ isAuthenticated: false });
        console.log(req.session.isLoggedIn);
        res.redirect('/login');
    }
}


// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    const db = client.db("userManagement");
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.redirect("/login.html");
});


app.post("/signup", async (req, res) => {
  const { firstName, lastName, companyName, address, mobileNo, email, password } = req.body;

  if (!firstName || !email || !password) return res.status(400).send("All fields are required");

  const hashedPassword = await bcrypt.hash(password, 10);


  try {
    // Check if a user already exists with the same email
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email is already registered");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await usersCollection.insertOne({
      firstName, lastName, companyName, address, mobileNo, email, password: hashedPassword
    });

    // Redirect to login page after successful signup
    res.redirect("/login.html");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});



app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await usersCollection.findOne({ email });
  
    if (user && await bcrypt.compare(password, user.password)) {
      
      req.session.user = {name: user.firstName, emailid: email};
      res.redirect("/dashboard.html");
       
    } else {
      console.log(req.session.isLoggedIn);
    }
  });




app.post("/change-password", async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userEmail = req.session.user.emailid;  // Assuming session contains user email
  
    try {
      // Find the user by their email
      const user = await usersCollection.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Check if the old password matches the current password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).send('Old password is incorrect');
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password
      await usersCollection.updateOne({ email: userEmail }, { $set: { password: hashedPassword } });
  
      // Send success response
      res.send('Password changed successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
});

// Protect dashboard and change password routes


app.get('/is-authenticated', isAuthenticated, (req, res) => {
    console.log(req.session.user.name);
});



app.post('/logout', async (req, res) => {
    try{
        console.log(req.session.user.name);
        req.session.user = {name: "", emailid: ""};
        req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed.' });
        }
        
        res.clearCookie('connect.sid'); 
        res.json({ message: 'Logged out successfully.' });
        });
        console.log(req.session.user.name);
    }catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});





app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
