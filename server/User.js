const mongoose = require('mongoose');
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
