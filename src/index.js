let fs = require("fs");
let path = require("path");
let mkdirp = require("mkdirp");
let promisify = require("util.promisify");
let writeFileAtomic = require("write-file-atomic");

mkdirp = promisify(mkdirp);
writeFileAtomic = promisify(writeFileAtomic);
let readFile = promisify(fs.readFile);
let readdir = promisify(fs.readdir);
let unlink = promisify(fs.unlink);
let rmdir = promisify(fs.rmdir);

function generateDefaultId() {
  let timestamp = (new Date().getTime() / 1000 | 0).toString(16);
  return timestamp + "xxxxxxxxxxxxxxxx".replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  }).toLowerCase();
}

let readJsonFile = (file, options) => {
  return new Promise((resolve, reject) => {
    readFile(file, options).then(data => {
      try {
        data = JSON.parse(data);
      }
      catch (error) {
        return reject(error);
      }
      resolve(data);
    }).catch((error) => {
      reject(error);
    });
  });
};

let writeJsonFile = (file, data, options) => {
  return new Promise((resolve, reject) => {
    data = JSON.stringify(data);
    writeFileAtomic(file, data, options).then((data) => {
      resolve();
    }).catch((error) => {
      reject(error);
    });
  });
};

let filterObjects = (objects, query) => {
  let queryKeys = Object.keys(query);
  return objects.filter(object => {
    let matches = 0;
    let objectKeys = Object.keys(object);
    if (object == null || objectKeys.length < 1) return false;
    queryKeys.forEach(key => {
      if (object[key] === queryKeys[key]) matches++;
    });
    return queryKeys.length === matches;
  });
};

let sortObjects = (objects, sortKey, options = {}) => {
  let returnValues = [1, -1];
  if (options.descending === true) {
    returnValues = returnValues.reverse();
  }
  return objects.sort((x, y) => {
    if (x[sortKey] > y[sortKey]) return returnValues[0];
    else return returnValues[1];
  });
};

let read = (storePath, query = {}, options = {}) => {
  let defaultOptions = {
    descending: false
  };
  options = Object.assign(defaultOptions, options);
  if (query._id) {
    return readJsonFile(`${storePath}/${query._id}.json`).then((data) => {
      return data;
    }).catch((error) => {
      return null;
    });
  } else {
    return readdir(storePath).then((files) => {
      let jsonFiles = files.filter(file => path.extname(file) === ".json");
      let tmpFiles = files.filter(file => path.extname(file).indexOf(".tmp") === 0);
      tmpFiles.forEach((file) => {
        unlink(`${storePath}/${file}`).catch(() => {});
      });
      let readPromises = jsonFiles.map((file) => {
        let _id = path.basename(file, ".json");
        return read(storePath, {_id});
      });
      return Promise.all(readPromises).then((objects) => {
        objects = filterObjects(objects, query);
        if (options.sort) {
          let {descending} = options;
          objects = sortObjects(objects, options.sort, {descending});
        }
        return objects;
      });
    }).catch((error) => {
      return null;
    });
  }
};

let write = (storePath, object = {}, options = {}) => {
  if (Object.keys(object) < 1) return false;
  if (object._id == null) {
    object._id = generateDefaultId();
  }
  let file = `${storePath}/${object._id}.json`;
  let write = () => {
    return writeJsonFile(file, object).then(() => {
      return object;
    }).catch((error) => {
      return false;
    });
  };
  if (options.mkdirp === true) {
    return mkdirp(storePath).then(write);
  } else {
    return write();
  }
};

let remove = (storePath, query = {}) => {
  if (query._id) {
    return unlink(`${storePath}/${query._id}.json`).then(() => {
      return true;
    }).catch((error) => {
      return false;
    });
  } else {
    return readdir(storePath).then((files) => {
      if (Object.keys(query).length < 1) {
        let unlinkPromises = files.map(file => {
          return unlink(`${storePath}/${file}`);
        });
        return Promise.all(unlinkPromises).then(() => {
          return rmdir(storePath).then(() => true);
        });
      } else {
        return read(storePath, query).then((objects) => {
          let unlinkPromises = objects.map((object) => {
            return unlink(`${storePath}/${object._id}.json`);
          });
          return Promise.all(unlinkPromises).then(() => true);
        });
      }
    }).catch((error) => {
      return false;
    });
  }
};

module.exports = {read, write, remove};
