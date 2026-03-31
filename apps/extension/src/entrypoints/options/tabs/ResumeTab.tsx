import React from "react";
import {
  Card,
  Upload,
  Button,
  message,
  Space,
  Spin,
  Alert,
  Typography,
  Empty
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuthStore } from "../../../store/auth-store";
import { useProfile } from "../../../lib/hooks/useProfile";
import {
  useUploadResume,
  useDeleteResume,
  useResumeDownloadUrl
} from "../../../lib/hooks/useResume";

const { Paragraph, Text } = Typography;

export function ResumeTab() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: profile, isLoading: isProfileLoading } = useProfile(token);
  const uploadMutation = useUploadResume(token);
  const deleteMutation = useDeleteResume(token);
  const downloadMutation = useResumeDownloadUrl(token);

  if (isProfileLoading) {
    return <Spin />;
  }

  const hasResume = !!profile?.resumeFilename;

  return (
    <Card title="Resume Management">
      {hasResume ? (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert
            type="success"
            message="Resume uploaded"
            icon={<CheckCircleOutlined />}
            showIcon
          />
          <div style={{ border: "1px solid #d9d9d9", borderRadius: "8px", padding: "16px" }}>
            <Paragraph>
              <Text strong>File:</Text> {profile.resumeFilename}
            </Paragraph>
            <Paragraph>
              <Text strong>Type:</Text> {profile.resumeMimeType}
            </Paragraph>
            <Paragraph>
              <Text strong>Uploaded:</Text>{" "}
              {dayjs(profile.resumeUploadedAt).format("MMM DD, YYYY HH:mm")}
            </Paragraph>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              Download
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </Space>
        </Space>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Alert message="No resume uploaded yet" type="info" showIcon />
          <Upload
            accept=".pdf"
            maxCount={1}
            beforeUpload={(file) => {
              uploadMutation.mutate(file);
              return false;
            }}
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploadMutation.isPending}
            >
              Upload Resume (PDF)
            </Button>
          </Upload>
        </Space>
      )}
    </Card>
  );
}
