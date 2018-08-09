let fs = require("fs")
let path = require("path")
let pify = require("pify")
let mkdirp = require("mkdirp")
let writeFileAtomic = require("write-file-atomic")

// Promisify fs functions
fs = pify(fs)
fs.mkdirp = pify(mkdirp)
writeFileAtomic = pify(writeFileAtomic)

let readJsonFile = (file, options) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, options).then(data => {
      try { data = JSON.parse(data) }
      catch (err) { return reject(err) }
      resolve(data)
    }).catch(error => reject(error))
  })
}

let writeJsonFile = (file, data, options) => {
  return new Promise((resolve, reject) => {
    data = JSON.stringify(data)
    writeFileAtomic(file, data, options)
    .then(data => resolve())
    .catch(error => reject(error))
  })
}

let filterObjects = (objects, query) => {
  let queryKeys = Object.keys(query)
  return objects.filter(object => {
    let matches = 0
    let objectKeys = Object.keys(object)
    if (object == null || objectKeys.length < 1) return false
    queryKeys.forEach(key => {
      if (object[key] === queryKeys[key]) matches++
    })
    return queryKeys.length === matches
  })
}

let sortObjects = (objects, sortKey, options = {}) => {
  let returnValues = [1, -1]
  if (options.descending === true) {
    returnValues = returnValues.reverse()
  }
  return objects.sort((x, y) => {
    if (x[sortKey] > y[sortKey]) return returnValues[0]
    else return returnValues[1]
  })
}

let read = (storePath, query = {}, options = {}) => {
  let defaultOptions = {
    descending: false
  }
  options = Object.assign(defaultOptions, options)
  if (query._id) {
    return fs.readFile(`${storePath}/${query._id}.json`).then((data) => {
      if (data == null || data.length < 1) return null
      return JSON.parse(data)
    }).catch((error) => {
      return null
    })
  } else {
    return fs.readdir(storePath).then((files) => {
      let jsonFiles = files.filter(file => path.extname(file) === ".json")
      let tmpFiles = files.filter(file => path.extname(file).indexOf(".tmp") === 0)
      tmpFiles.forEach((file) => {
        fs.unlink(`${storePath}/${file}`).catch(() => {});
      });
      let readPromises = jsonFiles.map((file) => {
        let _id = path.basename(file, ".json")
        return read(storePath, {_id})
      })
      return Promise.all(readPromises).then((objects) => {
        objects = filterObjects(objects, query)
        if (options.sort) {
          let {descending} = options
          objects = sortObjects(objects, options.sort, {descending})
        }
        return objects
      })
    }).catch((error) => {
      return null
    })
  }
}

let write = (storePath, object = {}, options = {}) => {
  if (Object.keys(object) < 1) return false
  if (object._id == null) {
    object._id = generateDefaultId()
  }
  let file = `${storePath}/${object._id}.json`
  let write = () => {
    return writeJsonFile(file, object).then(() => {
      return object
    }).catch((error) => {
      return false
    })
  }
  if (options.mkdirp === true) {
    return fs.mkdirp(storePath).then(write)
  } else {
    return write()
  }
}

let remove = (storePath, query = {}) => {
  if (query._id) {
    return fs.unlink(`${storePath}/${query._id}.json`).then(() => {
      return true
    }).catch((error) => {
      return false
    })
  } else {
    return fs.readdir(storePath).then((files) => {
      if (Object.keys(query).length < 1) {
        let unlinkPromises = files.map(file => {
          return fs.unlink(`${storePath}/${file}`)
        })
        return Promise.all(unlinkPromises).then(() => {
          return fs.rmdir(storePath).then(() => true)
        })
      } else {
        return read(storePath, query).then((objects) => {
          let unlinkPromises = objects.map((object) => {
            return fs.unlink(`${storePath}/${object._id}.json`)
          })
          return Promise.all(unlinkPromises).then(() => true)
        })
      }
    }).catch((error) => {
      return false
    })
  }
}

module.exports = {read, write, remove}
