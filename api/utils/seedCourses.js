import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "./connectDB.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import slugify from "./slugify.js";

const initialCourses = [
  {
    title: "Grade 10",
    code: "G10",
    category: "grade",
    academicLevel: "Grade 10",
    paymentPlan: "monthly",
    sortOrder: 1,
  },
  {
    title: "Grade 11",
    code: "G11",
    category: "grade",
    academicLevel: "Grade 11",
    paymentPlan: "monthly",
    sortOrder: 2,
  },
  {
    title: "Grade 12",
    code: "G12",
    category: "grade",
    academicLevel: "Grade 12",
    paymentPlan: "monthly",
    sortOrder: 3,
  },
  {
    title: "Grade 13",
    code: "G13",
    category: "grade",
    academicLevel: "Grade 13",
    paymentPlan: "monthly",
    sortOrder: 4,
  },
  {
    title: "O/L Revision",
    code: "OL-REV",
    category: "revision",
    academicLevel: "O/L Revision",
    paymentPlan: "one_time",
    sortOrder: 5,
  },
  {
    title: "A/L Revision",
    code: "AL-REV",
    category: "revision",
    academicLevel: "A/L Revision",
    paymentPlan: "one_time",
    sortOrder: 6,
  },
];

const seedCourses = async () => {
  try {
    await connectDB();

    const admin = await User.findOne({
      role: "admin",
      isActive: true,
    });

    if (!admin) {
      throw new Error(
        "No active administrator exists. Run npm run seed:admin first."
      );
    }

    for (const courseData of initialCourses) {
      const course = await Course.findOne({
        code: courseData.code,
      });

      if (course) {
        console.log(
          `Skipped existing course: ${courseData.title}`
        );

        continue;
      }

      await Course.create({
        ...courseData,
        slug: slugify(courseData.title),
        subject: "Economics",
        shortDescription: "",
        description: "",
        price: 0,
        currency: "LKR",
        weeklySchedule: [],
        isPublished: false,
        isEnrollmentOpen: true,
        isArchived: false,
        createdBy: admin._id,
        updatedBy: admin._id,
      });

      console.log(
        `Created course: ${courseData.title}`
      );
    }

    console.log(
      "Initial course seeding completed."
    );
  } catch (error) {
    console.error(
      "Course seeding failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedCourses();