from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def leer_inicio():
    return {"mensaje": "Hola, el servidor de peticiones funciona"}