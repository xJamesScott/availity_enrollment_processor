var express = require("express");
var router = express.Router();
var fs = require("fs");
var Papa = require("papaparse");

router.get("/", function (req, res) {
  // csv file and path
  const fileName = "enrollment.csv";
  const path = `./enrollment/${fileName}`;

  // create enrollment directory
  fs.mkdir("./enrollment", { recursive: true }, (err) => {
    if (err) {
      console.log("ERROR making directory: " + err);
    }
  });

  // parse csv
  let filePaths = [];
  const processData = (enrollmentUpload) => {
    const sortedUsers = enrollmentUpload.sort(function (a, b) {
      let nameA = a.name;
      let nameB = b.name;
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });

    // Handle duplicate users
    let usersNoDups = {};
    let noDupsArr = Object.values(usersNoDups);

    sortedUsers.forEach((user, i) => {
      if (!usersNoDups[0]) {
        usersNoDups[user["User Id"]] = user;
      }

      if (usersNoDups[0] && sortedUsers[i]) {
        for (let j = 0; j < noDupsArr.length; j++) {
          if (sortedUsers[i]["User Id"] == noDupsArr[j]["User Id"]) {
            if (sortedUsers[i]["Version"] > noDupsArr[j]["Version"]) {
              noDupsArr.splice(j, 1);
              usersNoDups[user]["User Id"] = user;
            }
          } else {
            usersNoDups[user]["User Id"] = user;
          }
        }
      }
    });

    // Seperate by insurance company
    let usersByCompany = {};
    noDupsArr = Object.values(usersNoDups);

    for (let h = 0; h < noDupsArr.length; h++) {
      usersByCompany[noDupsArr[h]["Insurance Company"]] = noDupsArr[h];
    }

    // create & save file for each company
    Object.values(usersByCompany).forEach((companyUsers) => {
      const csvProcessed = Papa.unparse([companyUsers], { header: true });
      const fileName = `${companyUsers["Insurance Company"]}.csv`;
      const companyCsvPath = `./enrollment/${fileName}`;
      console.log("Writing file...");
      fs.writeFile(companyCsvPath, csvProcessed, (err) => {
        if (err) {
          console.error("ERROR writing csv: " + err);
          return;
        }
      });
      filePaths = [
        ...filePaths,
        {
          path: companyCsvPath,
          name: fileName,
        },
      ];
    });
    console.log(filePaths); // ** resulting files by company **
  };

  // csv parser
  const createParsedCSV = (err, csv) => {
    Papa.parse(csv, {
      header: true,
      complete: (res) => processData(res.data), // parser callback
    });
  };

  fs.readFile(path, "utf8", (err, csv) => createParsedCSV(err, csv));

  res.send("All Files processed!");
});

module.exports = router;
