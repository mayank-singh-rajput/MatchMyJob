const mongoose = require('mongoose')

const jobSchema = mongoose.Schema(
  {
    customID: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
    },
    location: {
        type :String,
        required:true
    },
    salary: {
        minimumSalary:{ 
            type: Number,
        },
        maximumSalary: {
            type:Number
        }
    },
    experienced: {
        type: String,
    },
    description: {
        type: String,
        required: true
    },
    skills: {
        type: Array,
    },
    category: {
        type: String,
    },
    type: {
        type: String,
        enum: ["Interships", "Trainings", "Jobs"],
        default: "Jobs",
    }
  },
  {
    timestamps: true,
  }
);

const jobModel = mongoose.model('Job', jobSchema);
module.exports = jobModel;