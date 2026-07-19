import "dotenv/config";
import {
  getOrCreateDriveFolder,
} from "./googleDrive.js";

const setupGoogleDrive = async () => {
  try {
    const folder =
      await getOrCreateDriveFolder({
        name: "EconLLS Payment Slips",
      });

    console.log(
      "\nGoogle Drive setup completed."
    );

    console.log(
      `Folder name: ${folder.name}`
    );

    console.log(
      `Folder ID: ${folder.id}`
    );

    console.log(
      "\nAdd this to your .env:"
    );

    console.log(
      `GDRIVE_PAYMENT_SLIPS_FOLDER_ID=${folder.id}`
    );
  } catch (error) {
    console.error(
      "Google Drive setup failed:",
      error.response?.data ||
        error.message
    );

    process.exitCode = 1;
  }
};

setupGoogleDrive();