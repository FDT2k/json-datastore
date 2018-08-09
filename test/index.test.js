let fs = require("fs");
let pify = require("pify");
let rimraf = require("rimraf");
let jsonDatastore = require("./../src/index");
let datastorePath = `${process.cwd()}/tmp/datastore`;

fs = pify(fs);
rimraf = pify(rimraf);

beforeEach(() => {
  return rimraf(datastorePath);
});

afterEach(() => {
  return rimraf(datastorePath);
});

describe("read", () => {
  test("read from a non-exisiting path", async () => {
    let result = await jsonDatastore.read(datastorePath);
    expect(result).toBe(null);
    result = await jsonDatastore.read(datastorePath, {_id: 1});
    expect(result).toBe(null);
  });

  test("read by id", async () => {
    let data = {_id: 1, string: "hello"};
    let options = {mkdirp: true};
    await jsonDatastore.write(datastorePath, data, options);
    let result = await jsonDatastore.read(datastorePath, {_id: 1});
    expect(result).toEqual(data);
  });

  test("read all", async () => {
    let data1 = {_id: 1, string: "hello"};
    let data2 = {_id: 2, string: "world"};
    let options = {mkdirp: true};
    await Promise.all([
      jsonDatastore.write(datastorePath, data1, options),
      jsonDatastore.write(datastorePath, data2, options)
    ]);
    let result = await jsonDatastore.read(datastorePath);
    expect(result).toHaveLength(2);
  });
});

describe("write", () => {
  test("write to a non-exisiting path", async () => {
    let data = {_id: 1, string: "hello"};
    let result = await jsonDatastore.write(datastorePath, data);
    expect(result).toBe(false);
  });

  test("write to an exisiting path", async () => {
    let data = {_id: 1, string: "hello"};
    await fs.mkdir(datastorePath);
    let result = await jsonDatastore.write(datastorePath, data);
    expect(result).toEqual(data);
  });

  test("write with mkdirp", async () => {
    let data = {_id: 1, string: "hello"};
    let options = {mkdirp: true};
    let result = await jsonDatastore.write(datastorePath, data, options);
    expect(result).toEqual(data);
  });

  test("write to an exisiting file (update)", async () => {
    let data = {_id: 1, string: "hello"};
    let options = {mkdirp: true};
    await jsonDatastore.write(datastorePath, data, options);
    data.string = "hello-updated";
    let writeResult = await jsonDatastore.write(datastorePath, data, options);
    expect(writeResult).toEqual(data);
    let readResult = await jsonDatastore.read(datastorePath);
    expect(readResult).toHaveLength(1);
    expect(readResult[0]).toEqual(data);
  });
});

describe("remove", () => {
  test("remove a non-exisiting path", async () => {
    let result = await jsonDatastore.remove(datastorePath);
    expect(result).toBe(false);
    result = await jsonDatastore.remove(datastorePath, {_id: 1});
    expect(result).toBe(false);
  });

  test("remove by id", async () => {
    let data = {_id: 1, string: "hello"};
    let options = {mkdirp: true};
    await jsonDatastore.write(datastorePath, data, options);
    let result = await jsonDatastore.remove(datastorePath, {_id: 1});
    expect(result).toBe(true);
    result = await jsonDatastore.read(datastorePath, {_id: 1});
    expect(result).toBe(null);
  });

  test("remove all", async () => {
    let data1 = {_id: 1, string: "hello"};
    let data2 = {_id: 2, string: "world"};
    let options = {mkdirp: true};
    await Promise.all([
      jsonDatastore.write(datastorePath, data1, options),
      jsonDatastore.write(datastorePath, data2, options)
    ]);
    let result = await jsonDatastore.remove(datastorePath);
    expect(result).toBe(true);
    result = await jsonDatastore.read(datastorePath);
    expect(result).toBe(null);
  });
});
