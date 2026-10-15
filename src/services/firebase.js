import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export function obterFirebase() {
    const configuracao = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
    };

    if (!configuracao.apiKey || !configuracao.authDomain || !configuracao.projectId || !configuracao.appId) {
        const erro = new Error("Configuração do Firebase incompleta.");
        erro.code = "app/configuracao-ausente";
        throw erro;
    }

    const app = getApps().length ? getApp() : initializeApp(configuracao);
    return { auth: getAuth(app), db: getFirestore(app) };
}
