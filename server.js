
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// CONFIGURAÇÃO DO CORS
// ==========================================

const allowedOrigins = [
  "https://frontedlista.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origem não autorizada pelo CORS."));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ==========================================
// MIDDLEWARES
// ==========================================

app.use(express.json());

// ==========================================
// ROTA INICIAL
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    message: "API da Lista de Tarefas funcionando!",
    status: "online",
    endpoints: {
      listar: "GET /tasks",
      consultar: "GET /tasks/:id",
      criar: "POST /tasks",
      atualizar: "PUT /tasks/:id",
      concluir: "PATCH /tasks/:id",
      excluir: "DELETE /tasks/:id"
    }
  });
});

// ==========================================
// LISTAR TODAS AS TAREFAS
// ==========================================

app.get("/tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar tarefas:", error);
      return res.status(500).json({
        error: "Não foi possível listar as tarefas."
      });
    }

    return res.status(200).json({
      tasks: data
    });

  } catch (error) {
    console.error("Erro interno:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// CONSULTAR UMA TAREFA PELO ID
// ==========================================

app.get("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID da tarefa inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      task: data
    });

  } catch (error) {
    console.error("Erro ao consultar tarefa:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// CADASTRAR UMA NOVA TAREFA
// ==========================================

app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: "O título da tarefa é obrigatório."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: title.trim(),
          completed: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro ao cadastrar tarefa:", error);
      return res.status(500).json({
        error: "Não foi possível cadastrar a tarefa."
      });
    }

    return res.status(201).json({
      message: "Tarefa cadastrada com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao cadastrar tarefa:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// ATUALIZAR UMA TAREFA
// ==========================================

app.put("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, completed } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID da tarefa inválido."
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          error: "O título não pode ficar vazio."
        });
      }

      updates.title = title.trim();
    }

    if (completed !== undefined) {
      if (typeof completed !== "boolean") {
        return res.status(400).json({
          error: "O campo completed deve ser verdadeiro ou falso."
        });
      }

      updates.completed = completed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Informe ao menos um campo para atualizar."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      return res.status(500).json({
        error: "Não foi possível atualizar a tarefa."
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      message: "Tarefa atualizada com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// MARCAR TAREFA COMO CONCLUÍDA OU PENDENTE
// ==========================================

app.patch("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { completed } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID da tarefa inválido."
      });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        error: "Informe completed como verdadeiro ou falso."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao alterar status:", error);
      return res.status(500).json({
        error: "Não foi possível alterar o status da tarefa."
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      message: "Status da tarefa atualizado com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao alterar status:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// EXCLUIR UMA TAREFA
// ==========================================

app.delete("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID da tarefa inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao excluir tarefa:", error);
      return res.status(500).json({
        error: "Não foi possível excluir a tarefa."
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      message: "Tarefa excluída com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err.message);

  if (err.message === "Origem não autorizada pelo CORS.") {
    return res.status(403).json({
      error: err.message
    });
  }

  return res.status(500).json({
    error: "Ocorreu um erro interno no servidor."
  });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

// Na Vercel, a aplicação é exportada como função.
// Localmente, o servidor é iniciado com app.listen().

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log("------------------------------------");
    console.log("API de Lista de Tarefas iniciada!");
    console.log(`Servidor: http://localhost:${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/tasks`);
    console.log("------------------------------------");
  });
}

export default app;
