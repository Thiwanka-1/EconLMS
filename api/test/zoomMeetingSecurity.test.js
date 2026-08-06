import assert from "node:assert/strict";
import test from "node:test";

import {
  getZoomMeetingSecurityIssues,
} from "../utils/zoomMeetingSecurity.js";

import {
  approveZoomMeetingRegistrant,
  deleteZoomMeetingRegistrant,
  getZoomMeetingRegistrant,
} from "../utils/zoom.js";

const secureMeeting = {
  settings: {
    approval_type: 1,
    meeting_authentication: true,
    authentication_option:
      "matching-email-profile-id",
    authentication_name:
      "Signed in to account associated with invited email",
  },
};

test(
  "accepts Zoom's matching-invited-email authentication profile",
  () => {
    assert.deepEqual(
      getZoomMeetingSecurityIssues(
        secureMeeting,
        {
          requiredAuthenticationOption:
            "",
        }
      ),
      []
    );
  }
);

test(
  "rejects automatic approval and missing meeting authentication",
  () => {
    const issues =
      getZoomMeetingSecurityIssues(
        {
          settings: {
            approval_type: 0,
            meeting_authentication: false,
            authentication_option: "",
          },
        },
        {
          requiredAuthenticationOption:
            "",
        }
      );

    assert.equal(issues.length, 3);
    assert.match(
      issues.join(" "),
      /Require authentication/i
    );
    assert.match(
      issues.join(" "),
      /manual approval/i
    );
  }
);

test(
  "rejects exposing join information on Zoom's registration page",
  () => {
    const issues =
      getZoomMeetingSecurityIssues(
        {
          settings: {
            ...secureMeeting.settings,
            show_join_info: true,
          },
        },
        {
          requiredAuthenticationOption:
            "",
        }
      );

    assert.equal(issues.length, 1);
    assert.match(
      issues[0],
      /Show join info/i
    );
  }
);

test(
  "rejects generic signed-in Zoom authentication",
  () => {
    const issues =
      getZoomMeetingSecurityIssues(
        {
          settings: {
            ...secureMeeting.settings,
            authentication_name:
              "Sign in to Zoom",
          },
        },
        {
          requiredAuthenticationOption:
            "",
        }
      );

    assert.equal(issues.length, 1);
    assert.match(
      issues[0],
      /associated with invited email/i
    );
  }
);

test(
  "supports an exact configured Zoom authentication option ID",
  () => {
    const customNamedProfile = {
      settings: {
        ...secureMeeting.settings,
        authentication_name:
          "School protected profile",
      },
    };

    assert.deepEqual(
      getZoomMeetingSecurityIssues(
        customNamedProfile,
        {
          requiredAuthenticationOption:
            "matching-email-profile-id",
        }
      ),
      []
    );

    assert.equal(
      getZoomMeetingSecurityIssues(
        customNamedProfile,
        {
          requiredAuthenticationOption:
            "different-profile-id",
        }
      ).length,
      1
    );
  }
);

test(
  "uses the expected Zoom registrant approval, lookup and deletion endpoints",
  async (context) => {
    const originalFetch = global.fetch;
    const originalEnvironment = {
      accountId:
        process.env.ZOOM_ACCOUNT_ID,
      clientId:
        process.env.ZOOM_CLIENT_ID,
      clientSecret:
        process.env.ZOOM_CLIENT_SECRET,
    };

    process.env.ZOOM_ACCOUNT_ID =
      "test-account";
    process.env.ZOOM_CLIENT_ID =
      "test-client";
    process.env.ZOOM_CLIENT_SECRET =
      "test-secret";

    const requests = [];

    global.fetch = async (
      url,
      options = {}
    ) => {
      requests.push({
        url: String(url),
        options,
      });

      if (
        String(url).startsWith(
          "https://zoom.us/oauth/token"
        )
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "test-token",
            expires_in: 3600,
          }),
        };
      }

      return {
        ok: true,
        status: 204,
        json: async () => ({}),
      };
    };

    context.after(() => {
      global.fetch = originalFetch;

      for (const [name, value] of [
        [
          "ZOOM_ACCOUNT_ID",
          originalEnvironment.accountId,
        ],
        [
          "ZOOM_CLIENT_ID",
          originalEnvironment.clientId,
        ],
        [
          "ZOOM_CLIENT_SECRET",
          originalEnvironment.clientSecret,
        ],
      ]) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    });

    await approveZoomMeetingRegistrant({
      meetingId: "123 456 789",
      registrantId: "registrant/id",
      email: "STUDENT@example.com",
    });

    await getZoomMeetingRegistrant({
      meetingId: "123 456 789",
      registrantId: "registrant/id",
    });

    await deleteZoomMeetingRegistrant({
      meetingId: "123 456 789",
      registrantId: "registrant/id",
    });

    assert.equal(requests.length, 4);
    assert.equal(
      requests[1].options.method,
      "PUT"
    );
    assert.equal(
      requests[1].url,
      "https://api.zoom.us/v2/meetings/123456789/registrants/status"
    );
    assert.deepEqual(
      JSON.parse(
        requests[1].options.body
      ),
      {
        action: "approve",
        registrants: [
          {
            id: "registrant/id",
            email:
              "student@example.com",
          },
        ],
      }
    );
    assert.equal(
      requests[2].options.method,
      "GET"
    );
    assert.equal(
      requests[2].url,
      "https://api.zoom.us/v2/meetings/123456789/registrants/registrant%2Fid"
    );
    assert.equal(
      requests[3].options.method,
      "DELETE"
    );
    assert.equal(
      requests[3].url,
      "https://api.zoom.us/v2/meetings/123456789/registrants/registrant%2Fid"
    );
  }
);
