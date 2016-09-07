let fs = require("fs")
let pify = require("pify")
let rimraf = require("rimraf")
let jsonDatastore = require("./../src/index")
let datastorePath = `${process.cwd()}/tmp/datastore`

fs = pify(fs)
rimraf = pify(rimraf)

beforeEach(() => {
  return rimraf(datastorePath)
})

afterEach(() => {
  return rimraf(datastorePath)
})

test("write to a non-exisiting path", () => {
  let data = {_id: 1, string: "hello"}
  return jsonDatastore.write(datastorePath, data).catch(error => {
    return expect(error.code).toBe("ENOENT")
  })
})

test("write to an exisiting path", () => {
  let data = {_id: 1, string: "hello"}
  return fs.mkdir(datastorePath).then(() => {
    return jsonDatastore.write(datastorePath, data).then(_data => {
      return expect(_data).toEqual(data)
    })
  })
})

test("write with mkdirp", () => {
  let data = {_id: 1, string: "hello"}
  let options = {mkdirp: true}
  return jsonDatastore.write(datastorePath, data, options).then(_data => {
    return expect(_data).toEqual(data)
  })
})

test("write to an exisiting file (update)", () => {
  let data = {_id: 1, string: "hello"}
  let options = {mkdirp: true}
  return jsonDatastore.write(datastorePath, data, options).then(() => {
    data.string = "hello-updated"
    return jsonDatastore.write(datastorePath, data, options).then(_data => {
      return expect(_data).toEqual(data)
    })
  })
})

test("read by id", () => {
  let data = {_id: 1, string: "hello"}
  let options = {mkdirp: true}
  return jsonDatastore.write(datastorePath, data, options).then(() => {
    return jsonDatastore.read(datastorePath, {_id: 1}).then(_data => {
      return expect(_data).toEqual(data)
    })
  })
})

test("read all", () => {
  let data1 = {_id: 1, string: "hello"}
  let data2 = {_id: 2, string: "world"}
  let options = {mkdirp: true}
  return Promise.all([
    jsonDatastore.write(datastorePath, data1, options),
    jsonDatastore.write(datastorePath, data2, options)
  ]).then(() => {
    return jsonDatastore.read(datastorePath).then(_data => {
      return expect(_data.length).toBe(2)
    })
  })
})

test("remove by id", () => {
  let data = {_id: 1, string: "hello"}
  let options = {mkdirp: true}
  return jsonDatastore.write(datastorePath, data, options).then(() => {
    return jsonDatastore.remove(datastorePath, {_id: 1}).then(() => {
      return jsonDatastore.read(datastorePath, {_id: 1}).catch(error => {
        return expect(error.code).toBe("ENOENT")
      })
    })
  })
})

test("remove all", () => {
  let data1 = {_id: 1, string: "hello"}
  let data2 = {_id: 2, string: "world"}
  let options = {mkdirp: true}
  return Promise.all([
    jsonDatastore.write(datastorePath, data1, options),
    jsonDatastore.write(datastorePath, data2, options)
  ]).then(() => {
    return jsonDatastore.remove(datastorePath).then(() => {
      return jsonDatastore.read(datastorePath).catch(error => {
        return expect(error.code).toBe("ENOENT")
      })
    })
  })
})
