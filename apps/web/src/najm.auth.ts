import { defineAuth } from "najm-auth/client/server";
import { kafilApp } from "@/najm.config";

export const auth = defineAuth(kafilApp.auth);
