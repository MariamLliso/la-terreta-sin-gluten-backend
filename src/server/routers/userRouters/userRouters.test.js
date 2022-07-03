require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../index");
const connectDatabase = require("../../../database");

const User = require("../../../database/models/User");
const {
  newMockUser,
  mockUserCredentials,
  mockToken,
} = require("../../mocks/mocksUsers");
const { rolUser } = require("../../../database/utils/userRols");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await request(app).post("/user/register").send(newMockUser).expect(201);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("Given a POST 'user/register' endpoint", () => {
  describe("When it receives a request with valid name, username and password", () => {
    test("Then it should respond with status 201 and message 'User created'", async () => {
      const expectedMessage = "User created";
      const mockUsertoRegister = {
        name: "johndos",
        surnames: "johndos",
        username: "johndos",
        password: "johndos",
        userRol: rolUser,
      };
      const { body } = await request(app)
        .post("/user/register")
        .send(mockUsertoRegister)
        .expect(201);

      expect(body.msg).toBe(expectedMessage);
    });
  });

  describe("When it receives a request with username that already exists", () => {
    test("Then it should respond with status 409 and message 'User already exists'", async () => {
      const expectedMessage = "User already exists";

      const { body } = await request(app)
        .post("/user/register")
        .send(newMockUser)
        .expect(409);

      expect(body.msg).toBe(expectedMessage);
    });
  });

  describe("When it receives a bad request", () => {
    test("Then it should respond with status 409 and message 'Validation Failed'", async () => {
      const expectedMessage = "Validation Failed";

      const { body } = await request(app)
        .post("/user/register")
        .send({})
        .expect(400);

      expect(body.msg).toBe(expectedMessage);
    });
  });
});

describe("Given a POST user/login endpoint", () => {
  describe("When it receives a request with a registered user", () => {
    test("Then it should respond with a 200 status and a token", async () => {
      const mockLoginUser = {
        username: "johndoe",
        password: "johndoe",
        userRol: { code: "USR" },
      };
      User.findOne = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(mockLoginUser),
      }));
      jwt.sign = jest.fn().mockReturnValue(mockToken);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const { body } = await request(app)
        .post("/user/login")
        .send(mockUserCredentials)
        .expect(200);

      expect(body.token).not.toBeNull();
    });
  });
});
