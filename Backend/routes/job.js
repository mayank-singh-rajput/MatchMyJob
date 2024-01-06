const express = require('express')

const router = express.Router();

const { postJobs, fetchAllJobs, fetchJobs, fetchCompanyJobs, DeleteJob } = require("../controller/jobController");

const { Auth } = require("../middleware/user");

router.post("/", postJobs);

router.get("/", fetchAllJobs);

router.get("/filter", fetchJobs);

router.get("/company", fetchCompanyJobs);

router.delete("/", DeleteJob);

module.exports = router;