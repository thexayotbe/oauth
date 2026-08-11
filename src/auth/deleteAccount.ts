import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteAccountRequest } from "../api/otpApi";
import { signOutEverywhere } from "./signOut";

export async function deleteAccount() {
    await deleteAccountRequest();

    try{
        await GoogleSignin.revokeAccess();
    }catch{}

    await signOutEverywhere();
}