"use client";
import appwriteService from "@/appwrite/config";
import { Models } from "appwrite";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const ProfileCard = () => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await appwriteService.getCurrentUser();
        if (userData) {
          setUser(userData);
          setName(userData.name);

          if (userData.prefs?.profilePic) {
            setProfilePic(userData.prefs.profilePic);
          } else if (userData.prefs?.google_profile) {
            setProfilePic(userData.prefs.google_profile);
          } else {
            setProfilePic(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }
    try {
      await appwriteService.updatePassword(currentPassword, newPassword);
      setMessage("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage("Error updating password. Please check your current password.");
    }
  };

  const handleLogout = async () => {
    try {
      await appwriteService.logout();
      setMessage("Logged out successfully!");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error);
      setMessage("Error logging out. Please try again.");
    }
  };

  const handleGoHome = () => {
    router.push("/home");
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    setMessage("");
    try {
      if (!user?.$id) throw new Error("User ID not found");
      // Upload file to Appwrite Storage with userId as fileId
      const uploadRes = await appwriteService.uploadFile(file, user.$id);
      const fileId = uploadRes.$id;
      // Get preview URL
      const previewUrl = await appwriteService.getFilePreviewUrl(fileId);
      // Update user profile with new image URL
      await appwriteService.updateUserProfilePicture(user.$id, previewUrl);
      // Refetch user data to get the latest profilePic from preferences
      const updatedUser = await appwriteService.getCurrentUser();
      if (updatedUser?.prefs?.profilePic) {
        setProfilePic(`${updatedUser.prefs.profilePic}?t=${Date.now()}`); // cache-busting
      }
      setMessage("Profile picture updated!");
    } catch (error) {
      setMessage("Error uploading profile picture.");
    } finally {
      setUploading(false);
    }
  };

  return (
    user && (
      <div className="flex flex-col items-center relative">
        <Button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-gray-100 text-gray-600 py-2 px-4 rounded hover:bg-gray-200 transition duration-300"
        >
          Logout
        </Button>

        <div className="border-2 border-gray-200 rounded-lg p-3 mt-4 w-full max-w-5xl min-h-[70vh] shadow-md">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg">
              {profilePic ? (
                <Image
                  src={profilePic}
                  alt="Profile Pic"
                  className="w-full h-full object-cover"
                  width={96}
                  height={96}
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              {/* Upload button overlay */}
              <label className="absolute bottom-0 right-0 bg-white bg-opacity-80 rounded-full p-1 cursor-pointer border border-gray-300 hover:bg-opacity-100 transition" title="Upload profile picture">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={uploading}
                />
                <span className="text-xs text-gray-700">{uploading ? "..." : "✏️"}</span>
              </label>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{user.name}</p>
              <p className="text-base text-gray-600">{user.email}</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Name</Label>
              <Input
                type="text"
                value={name}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200 transition duration-300"
                disabled
              />
            </div>

            <div>
              <Label className="text-sm text-gray-500">Email</Label>
              <Input
                type="email"
                value={user.email}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200 transition duration-300"
                disabled
              />
            </div>
          </div>

          <Label className="text-lg font-semibold mt-6">Change Password</Label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200 transition duration-300"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200 transition duration-300"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200 transition duration-300"
              />
            </div>
          </div>

          <div className="flex justify-center mt-6 gap-4">
            <Button
              className="bg-blue-500 text-white py-2 px-6 rounded-lg transition-transform duration-300 hover:scale-105"
              onClick={handlePasswordUpdate}
            >
              Save
            </Button>
            <Button
              className="bg-gray-300 text-gray-600 py-2 px-6 rounded-lg transition-transform duration-300 hover:scale-105"
              onClick={handleGoHome}
            >
              Home
            </Button>
          </div>

          {message && <p className="mt-4 text-red-500">{message}</p>}
        </div>
      </div>
    )
  );
};

export default ProfileCard;
