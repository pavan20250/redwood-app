import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Client, Databases } from "appwrite";
import { API_ENDPOINT, PROJECT_ID } from "@/appwrite/config";
import { usePathname } from "next/navigation";


export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* Initialize the Appwrite client instance.*/
const client = new Client().setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);

/*Initialize the Appwrite Databases instance.*/
const databases = new Databases(client);

/*Export the reusable instances and utility functions.*/
export { client, databases };

//startup route checks
export const useIsStartupRoute = () => {
  const pathname = usePathname();
  return pathname ? /^\/startup\/[a-zA-Z0-9]+$/.test(pathname) : false;
};
