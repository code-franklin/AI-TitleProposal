const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid').v4;
const bcrypt = require('bcryptjs');
const cors = require("cors");
const { LanguageServiceClient } = require("@google-cloud/language");
require('dotenv').config();


const app = express();

// Middleware setup
app.use(express.json());
app.use(cors());

// Initialize Google Cloud Language client
const client = new LanguageServiceClient({
  apiKey: 'AIzaSyBqx-4PSSfP-vZBhBBgmu4uxmftsHLfTfE',
});

// // Define Advisor Schema
// const advisorSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//     specializations: { 
//     type: [String], 
//     required: function() { return this.role === 'adviser'; }
//   },
//   // panelistRole: { type: String, required: true } // Role of the panelist (e.g., Subject Expert, Statistician, Technical Expert)
//   design: { type: String, enum: ['Subject Expert', 'Statistician', 'Technical Expert'] }
// });

// const Advisor = mongoose.model("Advisor", advisorSchema);

const { Schema, model } = mongoose;

// Define schema for the proposal within the user schema
const ProposalSchema = new Schema({
  proposalTitle: { type: String, required: true },
  proposalText: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

// Define schema for task structure
const TaskSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  taskTitle: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
});

// Define schema for User document
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'adviser'] },
  profileImage: { type: String },
  specializations: { 
    type: [String], 
    required: function() { return this.role === 'adviser'; }
  },
  manuscriptStatus: {
    type: String,
    enum: ['reviseOnAdvicer', 'readyToDefense', 'reviseOnPanelist', 'approvedOnPanel', null],
    default: null,
  },
  panelistVotes: {
    type: [String],
    default: [],
  },
  publishingVotes: {
    type: [String],
    default: [],
  },
  course: { type: String },
  year: { type: Number },
  handleNumber: { type: Number },
  isApproved: { type: Boolean, default: false },
  chosenAdvisor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  advisorStatus: { type: String, enum: ['accepted', 'declined', 'pending', null] },
  declinedAdvisors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  panelists: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  channelId: { type: String },
  design: { type: String, enum: ['Subject Expert', 'Statistician', 'Technical Expert'] },
  groupMembers: { 
    type: [String], 
    required: function() { return this.role === 'student'; }
  },
  proposals: [ProposalSchema],
  tasks: [TaskSchema],
});

const User = model('User', userSchema);

module.exports = User;


// Synonym Schema
const synonymSchema = new mongoose.Schema({
  term: { type: String, required: true },
  synonyms: [String],
});
const Synonym = mongoose.model('Synonym', synonymSchema);

// POST route to add a new advisor
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isApproved) {
          return res.status(403).json({ message: 'Your account has not been approved by the admin yet.' });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
          return res.status(400).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      console.log('JWT Token:', token); // Log token for debugging    
      return res.status(200).json({ token, user });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json("Something went wrong you backend");
    }
  });
    

app.post('/api/advisors', async (req, res) => {
  const { name, specializations, design } = req.body;
  if (!name || !specializations || !design) {
    return res.status(400).json({ message: 'Name, specializations, and panelist role are required.' });
  }

  try {
    const newAdvisor = new User({
      name,
      specializations,
      design,
    });
    await newAdvisor.save();
    res.status(201).json({ message: 'Advisor added successfully', data: newAdvisor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});



// Helper function to get synonyms for entities
async function expandEntitiesWithSynonyms(entities) {
  const expandedTerms = new Set();

  for (const term of entities) {
    expandedTerms.add(term.toLowerCase()); // Ensure case-insensitivity by converting to lowercase
    const synonymEntry = await Synonym.findOne({ term: term.toLowerCase() }); // Match case-insensitive
    if (synonymEntry) {
      synonymEntry.synonyms.forEach((synonym) => expandedTerms.add(synonym.toLowerCase())); // Ensure case-insensitive
    }
  }

  return Array.from(expandedTerms); // Convert Set to array to remove duplicates
}
// Route to get random panelists based on selected advisor
app.post('/api/get-panelists', async (req, res) => {
  const { advisorId } = req.body; // Get the selected advisor's ID

  if (!advisorId) {
    return res.status(400).json({ message: 'Advisor ID is required.' });
  }

  try {
    // Get the selected advisor based on advisorId
    const selectedAdvisor = await User.findById(advisorId);
    
    if (!selectedAdvisor) {
      return res.status(404).json({ message: 'Advisor not found.' });
    }

    // Fetch all advisors and shuffle them to pick 3 random ones for panelists
    const allAdvisors = await User.find({}).exec();
    
    // Filter out the selected advisor from the list to avoid assigning them as a panelist
    const filteredAdvisors = allAdvisors.filter(advisor => advisor._id.toString() !== advisorId);
    
    // Create an object to store panelists by their role
    const panelistsByRole = {
      'Technical Expert': null,
      'Statistician': null,
      'Subject Expert': null,
    };

    // Shuffle the advisors and try to fill each role only once
    const shuffledAdvisors = filteredAdvisors.sort(() => 0.5 - Math.random());
    
    // Loop through the shuffled advisors and assign one of each role
    for (const advisor of shuffledAdvisors) {
      if (panelistsByRole[advisor.design] === null) {
        panelistsByRole[advisor.design] = {
          name: advisor.name,
          role: advisor.design,
        };
      }
      // Stop once all roles have been filled
      if (Object.values(panelistsByRole).every(panelist => panelist !== null)) {
        break;
      }
    }

    // Convert panelistsByRole object to an array of panelists
    const panelists = Object.values(panelistsByRole).filter(panelist => panelist !== null);

    // Send the panelists back to the frontend
    return res.status(200).json({ panelists });

  } catch (error) {
    console.error("Error getting panelists:", error);
    res.status(500).send("Error retrieving panelists.");
  }
});

// Proposal submit

app.post("/createProposal", async (req, res) => {
  const { userId, proposalTitle, proposalText } = req.body;
  // const { query } = req.body;

  // // Ensure query is provided
  // // if (!query || query.length === 0) {
  // //   return res.status(400).send("Query is required for search.");
  // // }
  //   // Ensure required fields are provided
    if (!userId || !proposalTitle || !proposalText) {
      return res.status(400).send("userId, proposalTitle, and proposalText are required.");
    }

  try {

    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).send("User not found.");
    }

    if(student.advisorStatus ==="accepted"){
      return res.status(404).json({message: 'Cannot submit proposal after advisor acceptance'});
    }

    const channelId = uuidv4();
    student.channelId = channelId;
    await student.save();

    const newProposal = { 
      proposalTitle, 
      proposalText,
      submittedAt: new Date()
    };

    student.proposals.push(newProposal);
    await student.save();

    // Function to escape special characters in the query terms
    const escapeRegex = (text) => text.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");

    // Split the query into terms and expand with synonyms (assuming this function exists)
    const expandedQueryTerms = await expandEntitiesWithSynonyms(proposalTitle,proposalText);
    console.log('Expanded Query Terms:', expandedQueryTerms); // Log expanded terms for debugging

    // Escape query terms for use in regex
    const escapedQueryTerms = expandedQueryTerms.map(term => escapeRegex(term));


    const declinedAdvisors = student.declinedAdvisors || [];
    // Search advisors based on specializations using the expanded terms and case-insensitive matching
    const advisors = await User.find({
      role: 'adviser',
      isApproved: true,
      specializations: { $in: escapedQueryTerms.map(term => new RegExp(term, 'i')) }
    });

    // If no advisors are found, return an appropriate message
    if (advisors.length === 0) {
      return res.status(404).json({ status: "not found", message: "No advisors found matching specializations." });
    }

    // Calculate match percentage for each advisor
    const advisorsWithMatchPercentage = advisors.map(advisor => {
      // Ensure specializations exist before processing
      if (!advisor.specializations || !Array.isArray(advisor.specializations)) {
        return { advisor, matchPercentage: 0 }; // No match if specializations is missing
      }

      // Count how many of the query terms match with the advisor's specializations
      const matchedSpecializations = advisor.specializations.filter(specialization =>
        escapedQueryTerms.some(term => new RegExp(term, 'i').test(specialization))
      );

      // Calculate the percentage of matched specializations
      const matchPercentage = (matchedSpecializations.length / escapedQueryTerms.length) * 100;

      return {
        advisor,
        matchPercentage,
        specializations: advisor.specializations // Ensure specializations are included
      };
    });

    // Sort advisors by match percentage in descending order
    advisorsWithMatchPercentage.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Return only the top 3 advisors
    // Return only the top 5 advisors
    // Return only the top 5 advisors

    const top5Advisors = advisorsWithMatchPercentage.slice(0, 5);

    // Send the response with the top advisors and their match percentages
    return res.status(200).json({
      status: "ok",
      results: top5Advisors.map(item => ({
        advisor: item.advisor,
        matchPercentage: item.matchPercentage.toFixed(2), // Optional: Round the percentage
        specializations: item.specializations, // Include specializations
        channelId: item.channelId
      }))
    });


  } catch (error) {
    console.error("Error searching advisors:", error);
    return res.status(500).send("Error analyzing or searching advisors.");
  }
});

// Route to analyze text using Google NLP FIXED
app.post("/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).send("Text is required for analysis.");

  try {
    const document = { content: text, type: "PLAIN_TEXT" };
    const [result] = await client.analyzeSentiment({ document });
    res.status(200).json({
      sentimentScore: result.documentSentiment.score,
      sentimentMagnitude: result.documentSentiment.magnitude,
    });
  } catch (error) {
    console.error("Error analyzing text:", error);
    res.status(500).send("Error analyzing text.");
  }
});




// POST route to add new synonyms Trained
app.post('/api/synonyms', async (req, res) => {
  const { term, synonyms } = req.body;
  if (!term || !synonyms) return res.status(400).json({ message: 'Both term and synonyms are required.' });

  try {
    let synonymEntry = await Synonym.findOne({ term });
    if (synonymEntry) {
      synonymEntry.synonyms = Array.from(new Set([...synonymEntry.synonyms, ...synonyms]));
      await synonymEntry.save();
    } else {
      synonymEntry = new Synonym({ term, synonyms });
      await synonymEntry.save();
    }
    res.status(201).json({ message: 'Synonyms added successfully', data: synonymEntry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});


// MongoDB connection
const mongoUrl = "mongodb+srv://LSPU:admin@research-management-por.m3kzu45.mongodb.net/ResearchTru?retryWrites=true&w=majority&appName=Research-Management-Portal";

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(5000, () => {
      console.log('Server is running on port http://localhost:5000');
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });  