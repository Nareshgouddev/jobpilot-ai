import React, { useEffect } from "react";
import {
  Card,
  Button,
  Select,
  Alert,
  Space,
  Spin,
  Typography,
  Form,
  Divider
} from "antd";
import { ExclamationCircleOutlined, SendOutlined } from "@ant-design/icons";
import { useDraftStore } from "../../../store/draft-store";
import { useProfile } from "../../../lib/hooks/useProfile";
import { useGenerateDraft } from "../../../lib/hooks/useGenerate";
import { useAuthStore } from "../../../store/auth-store";
import { useAnalytics } from "../../../hooks/useAnalytics";

const { Paragraph, Text } = Typography;

interface GenerateStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function GenerateStep({ onNext, onBack }: GenerateStepProps) {
  const [form] = Form.useForm();
  const token = useAuthStore((s) => s.accessToken);
  const { capturedJob, tone, setTone, setGeneratedDraft, setIsGenerating } =
    useDraftStore();
  const { data: profile } = useProfile(token);
  const generateMutation = useGenerateDraft(token);
  const { track, trackGeneration } = useAnalytics();

  useEffect(() => {
    form.setFieldsValue({ tone });
  }, [tone, form]);

  if (!capturedJob) {
    return (
      <Card style={{ minHeight: 300 }}>
        <Alert
          type="warning"
          icon={<ExclamationCircleOutlined />}
          message="No job captured"
          showIcon
        />
      </Card>
    );
  }

  const canGenerate =
    profile &&
    profile.email &&
    profile.skills &&
    profile.skills.length > 0 &&
    profile.experienceSummary &&
    profile.experienceSummary.length >= 20;

  async function handleGenerate() {
    if (!canGenerate || !capturedJob) return;

    const job = capturedJob;

    const startTime = performance.now();
    setIsGenerating(true);

    try {
      track({ name: "generation_started", properties: { tone } });

      const result = await generateMutation.mutateAsync({
        tone,
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          employmentType: "other",
          sourceUrl: job.sourceUrl
        },
        applicantProfile: {
          fullName: profile!.fullName,
          skills: profile!.skills,
          experienceSummary: profile!.experienceSummary
        }
      });

      const duration = Math.round(performance.now() - startTime);
      trackGeneration("completed", duration);
      setGeneratedDraft(result);
      onNext();
    } catch (error) {
      trackGeneration("failed");
      track({
        name: "generation_error",
        properties: { error: error instanceof Error ? error.message : "unknown" }
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card title="Step 2: Generate Draft" style={{ minHeight: 300 }} bordered={false}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Paragraph style={{ fontSize: "12px", color: "#666" }}>
          <strong>{capturedJob.title}</strong> at {capturedJob.company}
        </Paragraph>

        {!canGenerate && (
          <Alert
            type="warning"
            icon={<ExclamationCircleOutlined />}
            message="Incomplete Profile"
            description="Complete your profile in the extension Options before generating."
            showIcon
            closable
          />
        )}

        <Divider style={{ margin: "12px 0" }} />

        <Form form={form} layout="vertical">
          <Form.Item
            label="Tone"
            name="tone"
            rules={[{ required: true }]}
          >
            <Select
              value={tone}
              onChange={(val) => setTone(val)}
              options={[
                { label: "Formal", value: "formal" },
                { label: "Concise", value: "concise" },
                { label: "Friendly", value: "friendly" }
              ]}
            />
          </Form.Item>
        </Form>

        <Space style={{ width: "100%" }}>
          <Button onClick={onBack} style={{ flex: 1 }}>
            Back
          </Button>
          <Button
            type="primary"
            onClick={handleGenerate}
            disabled={!canGenerate}
            loading={generateMutation.isPending}
            icon={<SendOutlined />}
            style={{ flex: 1 }}
          >
            Generate
          </Button>
        </Space>
      </Space>
    </Card>
  );
}
