import { Request, Response } from "express";
import logger from "../../lib/logger";
import { SystemResponse } from "../../lib/response-handler";
import { IRoom } from "./entities";
import { checkGameRoomExists, getAllGameRooms } from "./helpers";

class GameController {
  static checkRoomAvailability = (req: Request, res: Response): void => {
    try {
      const { roomId } = req.params;
      const available: boolean = checkGameRoomExists(roomId);

      new SystemResponse(res, "Room availability checked", { available }).ok();
    } catch (error: unknown) {
      logger.error("Error checking room availability", error);

      new SystemResponse(res, "Error checking room availability", {
        error,
      }).internalServerError();
    }
  };

  static getAll = (req: Request, res: Response): void => {
    try {
      const rooms: IRoom[] = getAllGameRooms();

      new SystemResponse(res, "All rooms fetched", { rooms }).ok();
    } catch (error: unknown) {
      logger.error("Error getting all rooms", error);

      new SystemResponse(res, "Error getting all rooms", {
        error,
      }).internalServerError();
    }
  };
}

export default GameController;
