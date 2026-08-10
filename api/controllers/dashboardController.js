import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import PaymentSubmission from "../models/PaymentSubmission.js";
import Lesson from "../models/Lesson.js";
import LiveClass from "../models/LiveClass.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";

import asyncHandler from "../utils/asyncHandler.js";

import {
  getCurrentMonthCycle,
} from "../utils/billingPeriod.js";

import {
  checkStudentLiveClassAccess,
} from "../services/zoomRegistrationService.js";

const studentNotificationFields =
  "recipient type title message actionUrl data isRead readAt createdAt updatedAt";

const createStatusMap = (
  rows,
  knownStatuses = []
) => {
  const result = {};

  for (const status of knownStatuses) {
    result[status] = 0;
  }

  for (const row of rows) {
    result[row._id || "unknown"] =
      row.count;
  }

  return result;
};

const statusCountPipeline = [
  {
    $group: {
      _id: "$status",
      count: {
        $sum: 1,
      },
    },
  },
];

const buildRevenuePipeline = ({
  startDate = null,
  endDate = null,
} = {}) => {
  const pipeline = [
    {
      $match: {
        status: "approved",
      },
    },

    /*
     * Use reviewedAt when available.
     * Fall back to updatedAt for older records.
     */
    {
      $addFields: {
        decisionDate: {
          $ifNull: [
            "$reviewedAt",
            "$updatedAt",
          ],
        },
      },
    },
  ];

  if (startDate && endDate) {
    pipeline.push({
      $match: {
        decisionDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    });
  }

  pipeline.push(
    {
      $project: {
        currency: {
          $toUpper: {
            $ifNull: [
              "$currency",
              {
                $ifNull: [
                  "$expectedCurrency",
                  "LKR",
                ],
              },
            ],
          },
        },

        amount: {
          $convert: {
            input: {
              $ifNull: [
                "$approvedAmount",
                {
                  $ifNull: [
                    "$expectedAmount",
                    {
                      $ifNull: [
                        "$amount",
                        0,
                      ],
                    },
                  ],
                },
              ],
            },

            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },

    {
      $group: {
        _id: "$currency",

        amount: {
          $sum: "$amount",
        },

        paymentCount: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    }
  );

  return pipeline;
};

const formatRevenue = (rows) => {
  return rows.map((row) => ({
    currency: row._id,
    amount: row.amount,
    paymentCount:
      row.paymentCount,
  }));
};

export const getAdminDashboard =
  asyncHandler(async (req, res) => {
    const currentCycle =
      getCurrentMonthCycle();

    const now = new Date();

    const [
      totalStudents,
      activeStudents,
      emailVerifiedStudents,
      pendingNicVerifications,

      totalCourses,
      publishedCourses,
      monthlyCourses,
      oneTimeCourses,

      enrollmentStatusRows,
      paymentStatusRows,

      publishedLessons,
      upcomingLiveClasses,
      failedEmailNotifications,

      allTimeRevenueRows,
      currentMonthRevenueRows,

      pendingPayments,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments({
        role: "student",
      }),

      User.countDocuments({
        role: "student",
        isActive: true,
      }),

      User.countDocuments({
        role: "student",
        isEmailVerified: true,
      }),

      User.countDocuments({
        role: "student",
        nicVerificationStatus:
          "pending",
      }),

      Course.countDocuments({
        isArchived: false,
      }),

      Course.countDocuments({
        isPublished: true,
        isArchived: false,
      }),

      Course.countDocuments({
        paymentPlan: "monthly",
        isArchived: false,
      }),

      Course.countDocuments({
        paymentPlan: "one_time",
        isArchived: false,
      }),

      Enrollment.aggregate(
        statusCountPipeline
      ),

      PaymentSubmission.aggregate(
        statusCountPipeline
      ),

      Lesson.countDocuments({
        isPublished: true,
        isArchived: false,
      }),

      LiveClass.countDocuments({
        isPublished: true,
        status: "scheduled",

        startTime: {
          $gte: now,
        },
      }),

      Notification.countDocuments({
        "emailDelivery.status":
          "failed",
      }),

      PaymentSubmission.aggregate(
        buildRevenuePipeline()
      ),

      PaymentSubmission.aggregate(
        buildRevenuePipeline({
          startDate:
            currentCycle.accessStartsAt,

          endDate:
            currentCycle.monthEndsAt,
        })
      ),

      PaymentSubmission.find({
        status: "pending",
      })
        .select(
          [
            "student",
            "course",
            "billingPeriod",
            "paymentPlan",
            "expectedAmount",
            "expectedCurrency",
            "amount",
            "currency",
            "status",
            "createdAt",
          ].join(" ")
        )
        .populate(
          "student",
          "firstName lastName email mobileNumber"
        )
        .populate(
          "course",
          "title code"
        )
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          createdAt: -1,
        })
        .limit(10),

      AuditLog.find()
        .populate(
          "actor",
          "firstName lastName email role"
        )
        .populate(
          "targetUser",
          "firstName lastName email role"
        )
        .sort({
          createdAt: -1,
        })
        .limit(10),
    ]);

    res.status(200).json({
      success: true,

      generatedAt:
        new Date().toISOString(),

      currentBillingMonth: {
        year: currentCycle.year,
        month: currentCycle.month,
        label: currentCycle.label,
      },

      students: {
        total: totalStudents,
        active: activeStudents,
        emailVerified:
          emailVerifiedStudents,

        pendingNicVerification:
          pendingNicVerifications,
      },

      courses: {
        total: totalCourses,
        published:
          publishedCourses,

        monthly:
          monthlyCourses,

        oneTime:
          oneTimeCourses,
      },

      enrollments:
        createStatusMap(
          enrollmentStatusRows,
          [
            "pending",
            "active",
            "suspended",
            "cancelled",
          ]
        ),

      payments:
        createStatusMap(
          paymentStatusRows,
          [
            "pending",
            "approved",
            "rejected",
          ]
        ),

      content: {
        publishedLessons,
        upcomingLiveClasses,
      },

      notifications: {
        failedEmailDeliveries:
          failedEmailNotifications,
      },

      revenue: {
        allTime:
          formatRevenue(
            allTimeRevenueRows
          ),

        currentMonth:
          formatRevenue(
            currentMonthRevenueRows
          ),
      },

      pendingPayments,
      recentAuditLogs,
    });
  });

export const getStudentDashboard =
  asyncHandler(async (req, res) => {
    const studentId =
      req.user._id;

    const now = new Date();

    const fortyFiveDaysFromNow =
      new Date(
        Date.now() +
          45 *
            24 *
            60 *
            60 *
            1000
      );

    const [
      student,
      enrollments,
      pendingPaymentCount,
      pendingPayments,
      unreadNotificationCount,
      recentNotifications,
    ] = await Promise.all([
      User.findById(studentId).select(
        [
          "firstName",
          "lastName",
          "email",
          "mobileNumber",
          "nicNumber",
          "nicVerificationStatus",
          "nicVerificationNote",
          "nicImageUploadedAt",
        ].join(" ")
      ),

      Enrollment.find({
        student: studentId,
      })
        .populate(
          "course",
          [
            "title",
            "code",
            "shortDescription",
            "thumbnailUrl",
            "paymentPlan",
            "isPublished",
            "isArchived",
          ].join(" ")
        )
        .populate(
          "approvedBillingPeriods",
          "label year month"
        )
        .sort({
          updatedAt: -1,
        }),

      PaymentSubmission.countDocuments({
        student: studentId,
        status: "pending",
      }),

      PaymentSubmission.find({
        student: studentId,
        status: "pending",
      })
        .select(
          [
            "course",
            "billingPeriod",
            "paymentPlan",
            "expectedAmount",
            "expectedCurrency",
            "status",
            "createdAt",
          ].join(" ")
        )
        .populate(
          "course",
          "title code"
        )
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          createdAt: -1,
        })
        .limit(5),

      Notification.countDocuments({
        recipient: studentId,
        isRead: false,
      }),

      Notification.find({
        recipient: studentId,
      })
        .select(studentNotificationFields)
        .sort({
          createdAt: -1,
        })
        .limit(5),
    ]);

    const activeEnrollments =
      enrollments.filter(
        (enrollment) =>
          enrollment.status === "active" &&
          enrollment.course &&
          enrollment.course.isPublished &&
          !enrollment.course.isArchived
      );

    const activeCourseIds =
      activeEnrollments.map(
        (enrollment) =>
          enrollment.course._id
      );

    const upcomingCandidates =
      await LiveClass.find({
        course: {
          $in: activeCourseIds,
        },

        isPublished: true,
        status: "scheduled",

        startTime: {
          $gte: now,
          $lte: fortyFiveDaysFromNow,
        },
      })
        .populate(
          "course",
          "title code"
        )
        .populate(
          "billingPeriod",
          "label year month"
        )
        .sort({
          startTime: 1,
        })
        .limit(10);

    const upcomingLiveClasses = [];

    for (const liveClass of upcomingCandidates) {
      const access =
        await checkStudentLiveClassAccess({
          studentId,
          liveClass,
        });

      if (access.hasAccess) {
        upcomingLiveClasses.push({
          ...liveClass.toJSON(),

          access: {
            hasAccess: true,
          },
        });
      }

      if (
        upcomingLiveClasses.length >= 5
      ) {
        break;
      }
    }

    res.status(200).json({
      success: true,

      generatedAt:
        new Date().toISOString(),

      student,

      summary: {
        enrolledCourseCount:
          enrollments.length,

        activeCourseCount:
          activeEnrollments.length,

        pendingPaymentCount,

        unreadNotificationCount,
      },

      enrollments,
      pendingPayments,
      upcomingLiveClasses,
      recentNotifications,
    });
  });
