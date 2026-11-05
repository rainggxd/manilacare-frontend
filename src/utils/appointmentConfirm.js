/**
 * The confirmation message shown before an appointment's status is changed.
 * Each status has its own wording so the dialog always matches the button that was clicked.
 */
export function appointmentStatusConfirm(status, patientName) {
  const name = patientName || "The patient";
  switch (status) {
    case "Approved":
      return {
        title: "Approve this appointment?",
        message: `${name} will be notified by email (if they have one).`,
        confirmText: "Yes, approve",
        tone: "primary",
      };
    case "Rejected":
      return {
        title: "Reject this appointment?",
        message: `${name} will be notified by email (if they have one).`,
        confirmText: "Yes, reject",
        tone: "danger",
      };
    case "Completed":
      return {
        title: "Mark this appointment as completed?",
        message: `Do this only after ${name === "The patient" ? "the patient" : name} has been seen by the doctor.`,
        confirmText: "Yes, mark completed",
        tone: "primary",
      };
    default:
      return {
        title: `Change the status to ${status}?`,
        message: "Please check before continuing.",
        confirmText: "Yes, continue",
        tone: "primary",
      };
  }
}
