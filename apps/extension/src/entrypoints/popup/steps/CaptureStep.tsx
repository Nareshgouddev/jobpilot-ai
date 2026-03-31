import React, { useState } from "react";
import { Card, Button, Alert, Spin, Space, Typography, Divider } from "antd";
import {
  CopyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { requestCapturedJobFromActiveTab } from "../../../lib/runtime";
import type { CapturedJob } from "../../../types/messages";
import { useDraftStore } from "../../../store/draft-store";
import { useAnalytics } from "../../../hooks/useAnalytics";

const { Text, Paragraph } = Typography;

interface CaptureStepProps {
  onNext: () => void;
}

export function CaptureStep({ onNext }: CaptureStepProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { capturedJob, setCapturedJob } = useDraftStore();
  const { track } = useAnalytics();

  async function handleCapture() {
    const startTime = performance.now();
    setIsCapturing(true);
    setError(null);

    try {
      const job = await requestCapturedJobFromActiveTab();

      if (!job) {
        setError("No job metadata detected on this page");
        track({ name: "job_capture_failed", properties: { reason: "no_metadata" } });
        return;
      }

      setCapturedJob(job);
      const duration = Math.round(performance.now() - startTime);
      track({
        name: "job_captured",
        properties: { jobTitle: job.title, company: job.company, durationMs: duration }
      });
      onNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Capture failed"
      );
      track({
        name: "job_capture_error",
        properties: { error: err instanceof Error ? err.message : "unknown" }
      });
    } finally {
      setIsCapturing(false);
    }
  }

  if (isCapturing) {
    return (
      <Card style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin tip="Scanning page..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ minHeight: 300 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="error"
            message="Capture failed"
            description={error}
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
          />
          <Button onClick={handleCapture} block size="large">
            Try Again
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card
      title="Step 1: Capture Job"
      style={{ minHeight: 300 }}
      bordered={false}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Paragraph>
          Open a job post on LinkedIn, Indeed, or your job board and click{" "}
          <Text strong>Capture Job</Text> to extract the details.
        </Paragraph>

        {capturedJob && (
          <>
            <Divider />
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              message="Job Captured"
              description={
                <Paragraph style={{ marginBottom: 0, marginTop: "8px" }}>
                  <div><strong>{capturedJob.title}</strong></div>
                  <div style={{ color: "#666", fontSize: "12px" }}>{capturedJob.company}</div>
                </Paragraph>
              }
              showIcon
            />
          </>
        )}

        <Button
          type="primary"
          size="large"
          onClick={handleCapture}
          block
          icon={<CopyOutlined />}
        >
          {capturedJob ? "Capture New Job" : "Capture Current Job"}
        </Button>
      </Space>
    </Card>
  );
}
