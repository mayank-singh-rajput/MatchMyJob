const Job = require("../model/jobsModel");
const User = require("../model/userModel");
const Company = require("../model/companyModel");
const Applied = require("../model/appliedModel");
const jwt = require("jsonwebtoken");

const axios = require('axios');

const messageTemplate = async (name, job, company, email, contact) => {
  return `
    Hi ${name}

    Thank you for applying to the ${job} position at ${company}. We appreciate your interest in our company and your application for this role.

    Your application has been received and is currently under review by our team. We are excited to learn more about your qualifications and how they align with our requirements.

    If you have any questions or need further information about the position, please feel free to reach out to ${email} or ${contact}. We are here to assist you.

    We look forward to the possibility of working together and will be in touch soon with updates on your application.

    Best regards,
    ${company} Hiring Team
  `;
};

const applyUserToCompany = async (req, res) => {
  const token = req.headers.authorization;
  const { jobId } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  const splitToken = token.split(" ")[1];

  const decoded = await jwt.verify(splitToken, process.env.SECRET_KEY);
  const rootUserId = decoded.id;

  const userId = rootUserId;

  if (!userId || !jobId) {
    return res.status(400).json({ error: "Provide both User's Id and job Id" });
  }

  try {
    const user = await User.findById(userId);
    const job = await Job.findById(jobId);

    if (!user || !job) {
      return res.status(404).json({ error: "User or Job not found" });
    }

    const appiledToJob = await Applied.find({ userId, jobId });
    if (appiledToJob.length > 0) {
      return res.status(400).json({ error: "Job already applied" });
    }

    const appliedData = new Applied({
      userId,
      jobId,
      companyId: job.company,
    });
    await appliedData.save();

    const headers = { Authorization: token };

    const companyId = job.company;
    const company = await Company.findById(companyId);

    // Create a chat
    const chatBody = { userId: company.contacts };
    const chatResponse = await axios.post('http://localhost:5000/api/chat', chatBody, { headers });

    // Send a message in the chat
    const receiverUser = await User.findById(company.contacts);
    const message = await messageTemplate(user.name, job.title, company.companyName, receiverUser.email, receiverUser.contact);
    const chatId = await chatResponse.data._id;
    const messageBody = { chatId: chatId, message: message };
    const messageResponse = await axios.post('http://localhost:5000/api/message', messageBody, { headers });

    return res.json({ message: "Success", appliedData });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
};

const userFetchAppliedJob = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Authentication token missing" });
    }

    const splitToken = token.split(" ")[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

    const userId = rootUserId;

    let applied = await Applied.find({ userId });
    res.json(applied);
  } catch (error) {
    res.status(500).send({ error: "Error in fetching applied jobs" });
  }
};

const companyFetchAppliedJob = async (req, res) => {
  try {
    const { jobId } = req.query;

    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Authentication token missing" });
    }

    const splitToken = token.split(" ")[1];

    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const companyId = decoded.id;

    const appliedJobs = await Applied.find({ companyId, jobId }).sort({ createdAt: -1 });

    const userData = [];
    for (const applicant of appliedJobs) {
      const userInfo = await User.findById(applicant.userId);
      const applicantData = {
        _id: applicant._id,
        userId: applicant.userId,
        jobId: applicant.jobId,
        companyId: applicant.companyId,
        status: applicant.status,
        name: userInfo.name,
        email: userInfo.email,
        bio: userInfo.bio,
        profilePic: userInfo.profilePic,
        contact: userInfo.contact,
        resume: userInfo.resume,
        skills: userInfo.skills,
        createdAt: applicant.createdAt,
        updatedAt: applicant.updatedAt,
      };

      userData.push(applicantData);
    }

    res.json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error in fetching applied jobs" });
  }
};

const updateAppliedJob = async (req, res) => {
  try {
    const { ...data } = req.body;
    const { applicantId, status } = data;

    const updatedStatus = await Applied.updateOne({ _id: applicantId }, { status: status });

    if (updatedStatus.nModified === 0) {
      return res.status(203).json('No record found');
    }

    return res.json({ message: "Success", updatedStatus });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
};

module.exports = {
  applyUserToCompany,
  userFetchAppliedJob,
  companyFetchAppliedJob,
  updateAppliedJob,
};