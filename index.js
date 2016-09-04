let fs = require("fs")
let path = require("path")
let pify = require("pify")

// Promisify fs functions
fs = pify(fs)

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
    fs.writeFile(file, data, options)
    .then(data => resolve())
    .catch(error => reject(error))
  })
}

let ensurePath = path => {
  return new Promise((resolve, reject) => {
    fs.stat(path).then(resolve).catch(() => {
      fs.mkdir(path).then(resolve).catch(reject)
    })
  })
}

let generateDefaultId = () => {
  let timestamp = (new Date().getTime() / 1000 | 0).toString(16)
  return timestamp + "xxxxxxxxxxxxxxxx".replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16)
  }).toLowerCase()
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
    return fs.readFile(`${storePath}/${query._id}.json`).then(data => {
      if (data == null || data.length < 1) return null
      return JSON.parse(data)
    })
  } else {
    return fs.readdir(storePath).then(files => {
      files = files.filter(file => path.extname(file) === ".json")
      let readPromises = files.map(file => {
        let _id = path.basename(file, ".json")
        return read(storePath, {_id})
      })
      return Promise.all(readPromises).then(objects => {
        objects = filterObjects(objects, query)
        if (options.sort) {
          let {descending} = options
          objects = sortObjects(objects, options.sort, {descending})
        }
        return objects
      })
    })
  }
}

let write = (storePath, object = {}) => {
  if (Object.keys(object) < 1) return false
  return ensurePath(storePath).then(() => {
    if (object._id == null) {
      object._id = generateDefaultId()
    }
    let file = `${storePath}/${object._id}.json`
    let tempext = `.temp${process.pid}${generateDefaultId()}`
    let tempfile = file + tempext
    return writeJsonFile(tempfile, object).then(() => {
      return fs.rename(tempfile, file)
    }).then(() => object)
  })
}

let remove = (storePath, query = {}) => {
  if (query._id) {
    return fs.unlink(`${storePath}/${query._id}.json`)
  } else {
    return fs.readdir(storePath).then(files => {
      if (Object.keys(query).length < 1) {
        let unlinkPromises = files.map(file => {
          return fs.unlink(`${storePath}/${file}`).then(() => {
            return fs.rmdir(storePath)
          })
        })
        return Promise.all(unlinkPromises)
      } else {
        return read(storePath, query).then(objects => {
          let unlinkPromises = objects.map(object => {
            return fs.unlink(`${storePath}/${object._id}.json`)
          })
          return Promise.all(unlinkPromises)
        })
      }
    })
  }
}

module.exports = {read, write, remove}
