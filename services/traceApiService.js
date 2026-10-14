const TRACE_API_URL =
    process.env.TRACKING_API_URL || "https://api.traceapi.dev";

export async function trackWithTrace(trackingNumber, carrier = null) {
    const apiKey = process.env.TRACKING_API_KEY;

    if (!apiKey) {
        throw new Error("Trace API key is not configured.");
    }

    if (!trackingNumber || typeof trackingNumber !== "string") {
        throw new Error("A valid carrier tracking number is required.");
    }

    const normalizedTrackingNumber = trackingNumber.trim();

    if (!normalizedTrackingNumber) {
        throw new Error("A valid carrier tracking number is required.");
    }

    if (
        carrier !== null &&
        (typeof carrier !== "string" || !carrier.trim())
    ) {
        throw new Error("The selected carrier is invalid.");
    }

    const baseUrl = TRACE_API_URL.replace(/\/+$/, "");

    const requestBody = {
        tracking_number: normalizedTrackingNumber
    };

    // Pass the carrier selected by the frontend, if provided.
    if (carrier) {
        requestBody.carrier = carrier.trim().toLowerCase();
    }

    const response = await fetch(`${baseUrl}/v1/track`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(65000)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            result?.error?.message ||
            `Trace API request failed with status ${response.status}.`
        );

        error.status = response.status;
        throw error;
    }

    if (!Array.isArray(result?.events)) {
        throw new Error("Trace API returned an unexpected response.");
    }

    return result;
}