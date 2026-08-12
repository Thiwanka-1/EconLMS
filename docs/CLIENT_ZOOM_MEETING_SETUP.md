# EconLMS Zoom meeting setup

Use this checklist every time a new Zoom class is scheduled. EconLMS checks
these security settings before accepting the meeting.

## 1. Schedule the meeting in Zoom

1. Sign in to the client's Zoom web portal at `https://zoom.us/signin`.
2. Open **Meetings** and select **Schedule a Meeting**.
3. Enter the topic, date, start time, duration, and the correct time zone.
   For Sri Lanka use **GMT+05:30 Colombo**.
4. Select **Generate Automatically** for the meeting ID. Do not use the
   teacher's Personal Meeting ID.
5. Enable **Registration: Required**.
6. Enable **Passcode**.
7. Enable **Require authentication to join**.
8. Select the authentication method named **Signed in to account associated
   with invited email**.
9. **Waiting Room may remain off**. EconLMS does not require it.
10. Turn off **Allow participants to join anytime**.
11. Save the meeting.

Zoom's normal scheduling guide is available in its
[official documentation](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061316).

## 2. Set registration approval correctly

After saving the meeting:

1. Open the saved meeting in the Zoom web portal.
2. Find the **Registration** section and open **Registration Options** or
   **Edit**.
3. Choose **Manually Approve** registrants. This does not mean the teacher
   must approve EconLMS students manually; EconLMS approves eligible students
   through Zoom's API. It prevents unknown people from self-registering.
4. Make sure **Show join info on registration confirmation page** is off.
5. Save the registration settings.

Zoom explains that approved registrants receive individual join information
and that registration links can be revoked in its
[registrant-management guide](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0068036).

## 3. Connect it to EconLMS

1. Copy only the numeric Zoom meeting ID.
2. Sign in to EconLMS as an administrator.
3. Open **Live class management**.
4. Select the correct course and monthly billing period, when applicable.
5. Paste the Zoom meeting ID, set the LMS title/description and join window,
   then select **Connect Zoom meeting**.
6. If EconLMS reports a Zoom security problem, correct that meeting in Zoom
   and try again. Do not bypass the error or create an unsecured duplicate.

EconLMS reads the date, duration, and security settings from Zoom. It creates a
unique Zoom registrant for every currently eligible paid student using the
student's registered Zoom email.

## 4. Student requirements

- The student must use the Zoom email saved in their EconLMS profile.
- The student must be signed in to that exact Zoom account.
- The student's course payment/access must be valid.
- Students should join from the EconLMS **Live classes** page, not from a
  shared meeting ID or generic invitation.

## 5. Quick test before the first real class

1. Use one paid test-student account with a real Zoom email.
2. Connect a meeting scheduled at least 30 minutes ahead.
3. Confirm that the test student sees the class in EconLMS.
4. Select **Join class** and verify Zoom accepts the matching account.
5. Try a different Zoom account and verify it cannot use the protected join.
6. Suspend the test enrolment and verify its Zoom registration is revoked.

Never publish the Zoom meeting ID, passcode, registration URL, or teacher join
URL in WhatsApp groups or public pages.
