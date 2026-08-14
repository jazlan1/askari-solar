import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

// GET — Protected: list all feedbacks
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      feedbacks,
    });
  } catch (error) {
    console.error("Feedback GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — Public: submit new feedback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      contactNumber,
      locationCity,
      installationDate,
      serviceType,
      technicalBehaviour,
      technicalSkills,
      timelines,
      cleanliness,
      problemSolved,
      overallRating,
      commentsSuggestions,
      photoUrl,
      warrantyReceived,
      warrantyCardUrl,
    } = body;

    // Validate required fields
    if (
      !customerName ||
      !contactNumber ||
      !locationCity ||
      !installationDate ||
      !serviceType ||
      technicalBehaviour === undefined ||
      technicalSkills === undefined ||
      timelines === undefined ||
      cleanliness === undefined ||
      !problemSolved ||
      overallRating === undefined ||
      !warrantyReceived
    ) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // Convert and validate ratings
    const ratings = {
      technicalBehaviour: Number(technicalBehaviour),
      technicalSkills: Number(technicalSkills),
      timelines: Number(timelines),
      cleanliness: Number(cleanliness),
      overallRating: Number(overallRating),
    };

    for (const [key, value] of Object.entries(ratings)) {
      if (isNaN(value) || value < 1 || value > 5) {
        return NextResponse.json(
          { error: `Invalid rating value for ${key}. Must be between 1 and 5.` },
          { status: 400 }
        );
      }
    }

    // Validate enum values
    if (problemSolved !== "Yes" && problemSolved !== "No") {
      return NextResponse.json(
        { error: "Invalid option for 'Problem Solved'." },
        { status: 400 }
      );
    }

    if (
      warrantyReceived !== "Yes" &&
      warrantyReceived !== "No" &&
      warrantyReceived !== "Not Applicable"
    ) {
      return NextResponse.json(
        { error: "Invalid option for 'Warranty Card Received'." },
        { status: 400 }
      );
    }

    // Create feedback record
    const feedback = await prisma.feedback.create({
      data: {
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        locationCity: locationCity.trim(),
        installationDate: installationDate.trim(),
        serviceType: serviceType.trim(),
        technicalBehaviour: ratings.technicalBehaviour,
        technicalSkills: ratings.technicalSkills,
        timelines: ratings.timelines,
        cleanliness: ratings.cleanliness,
        problemSolved,
        overallRating: ratings.overallRating,
        commentsSuggestions: commentsSuggestions?.trim() || null,
        photoUrl: photoUrl || null,
        warrantyReceived,
        warrantyCardUrl: warrantyReceived === "Yes" ? warrantyCardUrl || null : null,
      },
    });

    return NextResponse.json(
      { success: true, id: feedback.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
