import express from 'express';
import { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

const PORT = 5000;

interface ServerData {
    server_id: string;
    server_name: string;
    link: string;
}
interface SearchResponse {
    status: "found" | "not_found";
    data: ServerData | null;
}

const client = createClient({
    url: process.env.REDIS_URL
});

client.on('error', (err) => console.log('Redis Client Error', err));

const app = express();

async function search(serverId: string): Promise<SearchResponse> {
    const data = await client.hGetAll(`server:${serverId}`);

    if (Object.keys(data).length === 0) {
        return { status: "not_found", data: null };
    }

    return {
        status: "found",
        data: {
            server_id: serverId,
            server_name: data.server_name as string,
            link: data.link as string
        }
    };
}

app.put("/register/:server_id/:server_name/:link", async (req : Request<{server_id : string, server_name : string,link : string}>, res : Response) => {
    try {
      const { server_id, server_name, link } = req.params;

      if (!link) {
        res.status(400).json({
          status: "rejected",
          message: "Link not found"
        });
        return;
      }

      await client.hSet(`server:${server_id}`, {
          server_name,
          link
      });

      res.json({
        status: "success",
        message: "Server registered successfully",
        data: { server_name, link }
      });
      return;

    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
      return;
    }
});

app.get(
  "/getConn/:server_id",
  async (req: Request<{ server_id: string }>, res: Response) => {
    try {
      const { server_id } = req.params;

      const data = await search(server_id);

      if (data.status === "not_found") {
        res.status(404).json({
          message: "Server not found",
        });
        return;
      }

      res.status(200).json(data);
      return;

    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  }
);

async function startServer() {
    await client.connect();
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT} !!`);
    });
}

startServer();
