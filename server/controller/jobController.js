const Job = require("../model/jobsModel");
const Company = require("../model/companyModel");
const jwt = require("jsonwebtoken");

const postJobs = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  const splitToken = token.split(" ")[1];

  try {
    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

    const { title, location, minimumSalary, maximumSalary, minimumExperienced, maximumExperienced, description, skills, category,  type } = req.body;

    // Find the company by rootUserId
    const existingCompany = await Company.findById(rootUserId).populate("companyName");
    if (!existingCompany) {
      return res.status(403).json({ error: "Company not exists" });
    }

    // Generate customID using title and company name
    const customID = title + '-' + existingCompany.companyName;
    const experienced = minimumExperienced + '-' + maximumExperienced;

    // Check if a job with the customID already exists
    const jobExist = await Job.find({ customID });

    if (jobExist.length > 0) {
      return res.status(400).json({ error: "Job already exists" });
    }

    const jobData = new Job({
      customID,
      title,
      company: existingCompany._id,
      location,
      salary: {
        minimumSalary,
        maximumSalary,
      },
      experienced: `${experienced} years`,
      description,
      skills,
      category,
      type
    });

    await jobData.save();

    return res.json({ message: "Success", jobData });
  } catch (error) {
    return res.status(500).json({ error: "Invalid data provided." });
  }
};

const fetchAllJobs = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    const jobData = [];

    for (const job of jobs) {
      const company = await Company.findOne({ _id: job.company });

      const jobWithCompany = {
        _id: job._id,
        title: job.title,
        location: job.location,
        minimumSalary: job.salary.minimumSalary,
        maximumSalary: job.salary.maximumSalary,
        experienced: job.experienced,
        description: job.description,
        skills: job.skills,
        category: job.category,
        type: job.type,
        company: company, // Include company data
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
      // console.log(job.salary.minimumSalary, job.salary.maximumSalary);

      jobData.push(jobWithCompany);
    }

    res.json(jobData);
  } catch (error) {
    console.error("Error in fetching jobs:", error);
    res.status(500).send({ error: "Error in fetching jobs" });
  }
};

const fetchJobs = async (req, res) => {
  const { title, category, type, location, skills, salaryRange } = req.query;
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  try {
    const query = {};

    if (title) {
      const firstWord = title.split(' ')[0];
      const titleRegex = new RegExp(`^${firstWord}`, 'i');
      query.title = titleRegex;
    }

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (location) {
      query.location = location;
    }

    if (skills) {
      const firstWord = skills.split(' ')[0];
      const skillsRegex = new RegExp(`^${firstWord}`, 'i');
      query.skills = { $elemMatch: { $regex: skillsRegex, $options: 'i' } };
    }

    if(salaryRange){
      let [minimumSalary, maximumSalary] = salaryRange.split('-').map(Number);
      minimumSalary = Math.round(minimumSalary / 25) * 25;
      maximumSalary = Math.ceil(maximumSalary / 25) * 25;
      query.$or = [{'salary.minimumSalary': { $gte: minimumSalary, $lte: maximumSalary }}, {'salary.maximumSalary': { $gte: minimumSalary , $lte: maximumSalary }}];
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });;
    const jobData = await Promise.all(
      jobs.map(async (job) => {
        const company = await Company.findOne({ _id: job.company });
        return {
          _id: job._id,
          title: job.title,
          location: job.location,
          minimumSalary: job.salary.minimumSalary,
          maximumSalary: job.salary.maximumSalary,
          experienced: job.experienced,
          description: job.description,
          skills: job.skills,
          category: job.category,
          type: job.type,
          company: company,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        };
      })
    );

    res.json(jobData);
  } catch (error) {
    console.error("Error in fetching jobs:", error);
    res.status(500).send({ error: "Error in fetching jobs" });
  }
};

const fetchCompanyJobs = async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  const splitToken = token.split(" ")[1];

  try {
    const decoded = jwt.verify(splitToken, process.env.SECRET_KEY);
    const rootUserId = decoded.id;

    const jobs = await Job.find({company: rootUserId});
    const jobData = await Promise.all(
      jobs.map(async (job) => {
        const company = await Company.findOne({ _id: job.company });
        return {
          _id: job._id,
          title: job.title,
          location: job.location,
          minimumSalary: job.salary.minimumSalary,
          maximumSalary: job.salary.maximumSalary,
          experienced: job.experienced,
          description: job.description,
          skills: job.skills,
          category: job.category,
          type: job.type,
          company: company,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        };
      })
    );

    res.json(jobData);
  } catch (error) {
    console.error("Error in fetching jobs:", error);
    res.status(500).send({ error: "Error in fetching jobs" });
  }
};

const DeleteJob = async(req, res) => {
  const token = req.headers.authorization;
  const { id } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Delete job
    await Job.findByIdAndDelete(id);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error in deleting jobs:", error);
    return res.status(500).json({ error: "Error deleting job" });
  }
}

module.exports = {
  postJobs,
  fetchAllJobs,
  fetchJobs,
  fetchCompanyJobs,
  DeleteJob,
};
