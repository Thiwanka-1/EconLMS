import "dotenv/config";

import {
  getOrCreateDriveFolder,
} from "./googleDrive.js";

const setupGoogleDrive = async () => {
  try {
    const paymentFolder =
      await getOrCreateDriveFolder({
        name:
          "EconLLS Payment Slips",
      });

    const nicFolder =
      await getOrCreateDriveFolder({
        name:
          "EconLLS NIC Documents",
      });

    console.log(
      "\nGoogle Drive setup completed."
    );

    console.log(
      "\nAdd or update these values in .env:\n"
    );

    console.log(
      `GDRIVE_PAYMENT_SLIPS_FOLDER_ID=${paymentFolder.id}`
    );

    console.log(
      `GDRIVE_NIC_DOCUMENTS_FOLDER_ID=${nicFolder.id}`
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