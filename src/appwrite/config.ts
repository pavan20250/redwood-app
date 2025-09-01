import { Client, Account, Databases, ID, OAuthProvider, Storage } from "appwrite";
import { v4 as uuidv4 } from 'uuid';

export const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT!;
export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID!;
export const BUCKET_ID = process.env.NEXT_PUBLIC_BUCKET_ID!;
export const STAGING_DATABASE_ID = process.env.NEXT_PUBLIC_STAGING_DATABASE_ID!;
export const STARTUP_ID = process.env.NEXT_PUBLIC_STARTUP_ID!;
export const PROJECTS_ID = process.env.NEXT_PUBLIC_PROJECTS_ID!;
export const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;

export const STARTUP_DATABASE = process.env.NEXT_PUBLIC_STARTUP_DATABASE!;

const PROFILE_BUCKET_ID = "68641b22002d2b74c110";

type CreateUserAccount = {
  email: string;
  password: string;
  name: string;
}

type LoginUserAccount = {
  email: string,
  password: string,
}

const appwriteClient = new Client()
  .setEndpoint(API_ENDPOINT)
  .setProject(PROJECT_ID);

const account = new Account(appwriteClient);
const storageClient = new Storage(appwriteClient);
export const databases = new Databases(appwriteClient);

export class AppwriteService {
  async createUserAccount({ email, password, name }: CreateUserAccount) {
    try {
      // userId using uuidv4
      const userId = uuidv4().replace(/-/g, '');
      
      const userAccount = await account.create(userId, email, password, name);
      console.log('Account creation response:', userAccount);
      alert("Successful")

      // Auto-login after account creation
      if (userAccount) {
        return this.login({email, password})
      } else {
        return userAccount
      } 

    } catch (error: any) {
      console.error("Error creating user account:", error.message);
      throw new Error(error.message || "Unable to create account. Please try again.");
    }
  }

  async login({ email, password }: LoginUserAccount) {
    try {
      sessionStorage.removeItem("projectsInstructionsAlertCount");
      sessionStorage.removeItem("dashboardWelcomeAlertCount");
      sessionStorage.removeItem("projectsScreenInstructionsAlertCount");
      await account.getSession('current');
      await account.deleteSession('current');
    } catch (e) {
      // If session doesn't exist, we can ignore
    }
    // create a new session
    return await account.createEmailPasswordSession(email, password);
  }
  

  async isLoggedIn(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user; 
    } catch (error: any) {
      console.error("Error checking login status:", error.message);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const user = await account.get();
      return user;
    } catch (error) {
      console.log("getCurrentUser error: " + error);
    }
  
    return null;
  }

  async loginWithGoogle(successRedirectUrl: string, failureRedirectUrl: string) {
    try {
      await account.createOAuth2Session(OAuthProvider.Google, process.env.NEXT_PUBLIC_SUCCESS_REDIRECT_URL!, process.env.NEXT_PUBLIC_FAILURE_REDIRECT_URL!);
    } catch (error: any) {
      console.error("Error during Google login:", error.message);
      throw new Error(error.message || "Google login failed.");
    }
  }

  async logout() {
    try {
      // Clear the projects instructions alert count from sessionStorage
      sessionStorage.removeItem("projectsInstructionsAlertCount");
      sessionStorage.removeItem("projectsScreenInstructionsAlertCount");
      sessionStorage.removeItem("dashboardWelcomeAlertCount");

      return await account.deleteSession("current");
    } catch (error: any) {
      console.error("Logout error:", error.message);
      throw new Error("Unable to log out. Please try again.");
    }
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    try {
      // Appwrite requires the new password first, followed by the old password for re-authentication
      await account.updatePassword(newPassword, oldPassword);
      alert("Password updated successfully!");
    } catch (error: any) {
      console.error("Error updating password:", error.message);
    }  
  }

  // Method to send password reset email
  async sendPasswordResetEmail(email: string) {
    try {
      await account.createRecovery(email, "https://redwood-app.vercel.app/resetpassword");
      alert("Password reset link sent to your email!");
    } catch (error: any) {
      console.error("Error sending password reset email:", error.message);
      throw new Error(error.message || "Failed to send password reset email.");
    }
  }

  async resetPassword(userId: string, secret: string, newPassword: string) {
    try {
      await account.updateRecovery(userId, secret, newPassword); 
      alert("Password has been reset successfully!");
    } catch (error: any) {
      console.error("Error resetting password:", error.message);
      throw new Error(error.message || "Failed to reset password.");
    }
  }


  async uploadFile(file: File, fileId?: string) {
    try {
      const id = fileId || uuidv4();
      const response = await storageClient.createFile(PROFILE_BUCKET_ID, id, file);
      return response;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  async updateUserProfilePicture(userId: string, photoUrl: string) {
    try {
        await account.updatePrefs({
            profilePic: photoUrl
        });
        console.log('Profile picture URL updated in user preferences');
      alert("Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile picture:", error.message);
      throw new Error(error.message || "Failed to update profile picture.");
    }
  }

  async updateUserDetails(name: string, email: string, password: string) {
    try {
      await account.updateEmail(email, password); 
      await account.updatePrefs({ name }); 
      alert("User details updated successfully!");
    } catch (error: any) {
      console.error("Error updating user details:", error.message);
      throw new Error(error.message || "Failed to update user details.");
    }
  }
  
  async getFilePreviewUrl(fileId: string) {
    try {
      return storageClient.getFilePreview(PROFILE_BUCKET_ID, fileId).toString();
    } catch (error) {
      console.error("Error generating file preview URL:", error);
      throw error;
    }
  }
}

const appwriteService = new AppwriteService();
export default appwriteService;