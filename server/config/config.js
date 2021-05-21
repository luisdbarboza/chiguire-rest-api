//Modo de la aplicacion
// process.env.mode = "desarrollo";
process.env.mode = "desarrollo";

//PUERTO
process.env.PORT = process.env.PORT || 8000;

//ENTORNO
process.env.NODE_ENV = process.env.NODE_ENV || "dev";

//Vencimiento del TOKEN
// 60 seg * 60 min * 24 horas * 30 dias
process.env.CADUCIDAD_TOKEN = "365d";

//SEED
process.env.SEED = process.env.SEED || "este-es-el-seed-desarrollo";

//SEED CONFIRMACION DE EMAIL
process.env.EMAIL_SECRET = "i'm picke-rick!";

//URL APLICACION WEB
process.env.APP_URL = "http://localhost:3000";

//CUENTA PARA ENVIAR EMAILS
process.env.SERVER_GMAIL_ACCOUNT = 'lbarboza.apps@gmail.com';
process.env.SERVER_GMAIL_PASSWORD = 'eujgeoghohvsjpcg';

process.env.MONGO_URI = process.env.mode === "desarrollo" ? "mongodb://localhost:27017/chiguire" : "mongodb+srv://lbarbozanav:1AJnhO1HA1q0X8OV@cluster0.nxtbc.mongodb.net/chiguire?retryWrites=true&w=majority";