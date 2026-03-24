import express from 'express';
import { Request, Response } from 'express';
import { register } from 'node:module';
const PORT = 5000;

interface ServerNode {
    server_id : string,
    server_name: string;
    link: string;
}
interface Store{
    registered : ServerNode[],
    Agents : ServerNode[]
}

interface ServerData {
    server_id: string;
    server_name: string;
    link: string;
}
interface SearchResponse {
    status: "found" | "not_found";
    data: ServerData | null;
}


const store : Store = {
    'registered' : [],
    'Agents' : []
}

const app = express();

async function search(serverId: string): Promise<SearchResponse> {
    const server = store.registered.find(n => n.server_id === serverId);

    if (!server) {
        return { status: "not_found", data: null };
    }

    return {
        status: "found",
        data: {
            server_id: server.server_id,
            server_name: server.server_name,
            link: server.link
        }
    };
}

app.put("/register/:server_id/:server_name/:link",(req : Request<{server_id : string, server_name : string,link : string}>, res : Response) => {
    try {
      const { server_id, server_name, link } = req.params;

      if (!link) {
        return res.status(400).json({
          status: "rejected",
          message: "Link not found"
        });
      }

      store.registered.push({ server_id, server_name, link });

      return res.json({
        status: "success",
        message: "Server registered successfully",
        data: { server_name, link }
      });

    } catch (err) {
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
});

app.get(
  "/getConn/:server_id",
  async (req: Request<{ server_id: string }>, res: Response) => {
    try {
      const { server_id } = req.params;

      const data = await search(server_id);

      if (data.status === "not_found") {
        return res.status(404).json({
          message: "Server not found",
        });
      }

      return res.status(200).json(data);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

app.listen(PORT, () => {
    console.log("Server is listening !!");
})
