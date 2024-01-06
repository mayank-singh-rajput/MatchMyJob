const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const companySchema = mongoose.Schema(
  {
    companyName: {
        type :String,  
        required: true
    },
    email: {
        type :String,
        unique:true,
    },
    password:{
        type:String,
    },
    contacts:{
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
    },
    location: {
      type: String,
      default: 'India'
    },
    description: {
        type: String,
        default: 'Loading...'
    },
    startedIn: {
        type: String,
        default: 'Enst. In 2023'
    },
    photo: {
        type: String,
        default: "https://cdn-icons-png.flaticon.com/512/9790/9790561.png",
    },
  },
  {
    timestamps: true,
  }
);

companySchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

companySchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign({ id: this._id, email: this.email }, process.env.SECRET_KEY, {
      expiresIn: "24h",
    });

    return token;
  } catch (error) {
    console.log("error while generating token");
  }
};

const companyModel = mongoose.model('Company', companySchema);
module.exports = companyModel;