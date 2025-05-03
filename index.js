const express = require("express");
const jsonServer = require("json-server");
const bodyParser = require("body-parser");

const app = express();
var args = process.argv.slice(2);
const env = args[0].split(":")[1];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = env === "qa" ? 3001 : 3000;

const dbName = env === "qa" ? "org-db-qa.json" : "org-db.json";

const router = jsonServer.router(dbName); // db.json should be in the root directory
const middlewares = jsonServer.defaults();

app.use(middlewares);

function validateRole(db, roleId) {
  if (!roleId) return true;

  const roleIds = db
    .get("roles")
    .value()
    .map((_) => _.id);

  return roleIds.indexOf(Number(roleId)) >= 0;
}

function validateManagerIsValid(db, managerId) {
  if (!managerId) return true;
  const manager = db.get("employees").find({ id: managerId }).value();
  const roles = db.get("roles").find({ id: manager.roleId }).value();

  return roles.title.indexOf("Manager") >= 0;
}

app.post("/employees", (req, res, next) => {
  const db = router.db;

  if (!validateRole(db, req.body.roleId)) {
    return res.status(400).json({ error: "Role ID does not exist" });
  }

  if (!validateManagerIsValid(db, req.body.managerId)) {
    return res.status(400).json({ error: "Manager ID is not valid" });
  }

  const { name, departmentId, roleId, managerId } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  req.body = { name, departmentId, roleId, managerId };

  next();
});

app.patch("/employees/:id", (req, res, next) => {
  const db = router.db;

  if (!validateRole(db, req.body.roleId)) {
    return res.status(400).json({ error: "Role ID does not exist" });
  }

  if (!validateManagerIsValid(db, req.body.managerId)) {
    return res.status(400).json({ error: "Manager ID is not valid" });
  }

  next();
});

app.post("/departments", (req, res, next) => {
  const db = router.db;
  const departmentNames = db
    .get("departments")
    .value()
    .map((_) => _.name);

  if (departmentNames.indexOf(req.body.name) >= 0) {
    return res.status(400).json({ error: "Department name already exists" });
  }

  const { name } = req.body;
  req.body = { name };

  next();
});

function validateRoleTitles(title) {
  if (!title) return true;

  const db = router.db;
  const roleTitles = db
    .get("roles")
    .value()
    .map((_) => _.title);

  return roleTitles.indexOf(title) < 0;
}
app.post("/roles", (req, res, next) => {
  if (!validateRoleTitles(req.body.title)) {
    return res.status(400).json({ error: "Role already exists" });
  }

  const { title, minimumSalary = null, maximumSalary = null } = req.body;
  req.body = { title, minimumSalary, maximumSalary };

  next();
});

app.patch("/roles/:id", (req, res, next) => {
  if (!validateRoleTitles(req.body.title)) {
    return res.status(400).json({ error: "Role already exists" });
  }

  next();
});

app.use(router);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
