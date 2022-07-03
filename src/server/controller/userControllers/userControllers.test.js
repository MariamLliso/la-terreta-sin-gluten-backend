const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../../../database/models/User");
const UserRol = require("../../../database/models/UserRol");
const {
  mockUser,
  mockRol,
  mockUserCredentials,
  mockToken,
  mockBadUser,
  mockUserWithId,
  mockRolWithoutId,
} = require("../../mocks/mocksUsers");
const {
  userRegister,
  userLogin,
  getUserProfile,
} = require("./userControllers");

jest.mock("../../../database/models/User", () => ({
  findOne: jest.fn().mockResolvedValue(() => mockUserCredentials),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn().mockResolvedValue(() => true),
  hash: jest.fn().mockResolvedValue(() => "mockPasswordEncrypted"),
}));

const res = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
};

const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Given a userRegister function", () => {
  describe("When it's called with a new name, username and password", () => {
    test("Then it should call the response method status with 201 and it's json method with the message 'User created'", async () => {
      const expectedMessage = { msg: "User created" };

      const req = {
        body: mockUser,
      };

      const expectedStatus = 201;

      User.findOne = jest.fn().mockResolvedValue(false);
      User.create = jest.fn().mockResolvedValue(mockUser);
      UserRol.findOne = jest.fn().mockResolvedValue(mockRol);

      await userRegister(req, res, null);

      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expectedMessage);
    });
  });

  describe("When it's called with an existing username", () => {
    test("Then it should call next with an error", async () => {
      const expectedError = new Error("User already exists");
      const req = {
        body: mockUser,
      };
      User.findOne = jest.fn().mockResolvedValue(true);

      await userRegister(req, null, next);

      expect(next).toHaveBeenCalledWith(expectedError);
    });
  });

  describe("When it's invoked an a error occurs", () => {
    test("Then it should call next with an error", async () => {
      const req = {
        body: mockBadUser,
      };
      const expectedError = new Error("Bad request");

      User.findOne = jest.fn().mockResolvedValue(false);

      await userRegister(req, null, next);

      expect(next).toHaveBeenCalledWith(expectedError);
    });
  });
});

describe("Given userLogin function", () => {
  describe("When it's called with correct user credentials", () => {
    jwt.sign = jest.fn().mockReturnValue(mockToken);

    test("Then it should call response method status with 200 and method json with a token", async () => {
      // Arrange
      const req = {
        body: {
          id: 1,
          username: "username",
          password: "password",
          userRol: { code: "USR" },
        },
      };

      const mockCredentials = {
        username: "username",
        password: "password",
        userRol: { code: "USR" },
      };

      const expectedStatus = 200;
      User.findOne = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(mockCredentials),
      }));
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      // Act
      await userLogin(req, res, null);

      // Assert
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith({ token: mockToken });
    });
  });

  describe("When it's called with incorrect username", () => {
    test("Then it should call next method with 'Username or password are worng'", async () => {
      // Arrange
      User.findOne = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(false),
      }));

      const req = {
        body: {
          id: 1,
          username: "menganito",
          password: "password",
          userRol: { code: "USR" },
        },
      };

      const expectErrorMessage = new Error("Username or password are worng");

      // Act
      await userLogin(req, null, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expectErrorMessage);
    });
  });

  describe("When it's called with incorrect password", () => {
    test("Then it should call next method with 'Username or password are worng'", async () => {
      // Arrange
      const mockCredentials = {
        username: "username",
        password: "password",
        userRol: { code: "USR" },
      };
      User.findOne = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(mockCredentials),
      }));
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const req = {
        body: {
          id: 1,
          username: "username",
          password: "incorrectPassword",
        },
      };

      const expectErrorMessage = new Error("Username or password are worng");

      // Act
      await userLogin(req, null, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expectErrorMessage);
    });
  });
});

describe("Given getUserProfile function", () => {
  describe("When it's called with a correct user id at request", () => {
    test("Then it should call response method status with 200 and method json with a user profile data", async () => {
      // Arrange
      const req = {
        user: {
          id: mockRol,
        },
      };

      const expectUserData = {
        name: mockUserWithId.name,
        surnames: mockUserWithId.surnames,
        username: mockUserWithId.username,
        userRol: mockRolWithoutId,
      };

      const expectedStatus = 200;

      User.findById = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(mockUserWithId),
      }));

      // Act
      await getUserProfile(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expectUserData);
    });
  });

  describe("When it's called with a incorrect user id at request", () => {
    test("Then it should call next method with error 'Bad request'", async () => {
      // Arrange
      const req = {
        user: {
          id: "evil user",
        },
      };

      const expectedError = new Error("Bad request");

      User.findById = jest.fn(() => ({
        populate: jest.fn().mockReturnValue(false),
      }));

      // Act
      await getUserProfile(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expectedError);
    });
  });
});
