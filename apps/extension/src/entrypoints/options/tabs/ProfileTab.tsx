import React, { useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Spin,
  Divider,
  Row,
  Col
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import type { EducationEntry } from "@jobpilot/shared";
import { useAuthStore } from "../../../store/auth-store";
import { useProfile, useUpdateProfile } from "../../../lib/hooks/useProfile";

export function ProfileTab() {
  const [form] = Form.useForm();
  const [educationItems, setEducationItems] = React.useState<EducationEntry[]>([]);
  const token = useAuthStore((s) => s.accessToken);

  const { data: profile, isLoading } = useProfile(token);
  const updateMutation = useUpdateProfile(token);

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        fullName: profile.fullName,
        email: profile.email,
        skills: profile.skills?.join(", "),
        experienceSummary: profile.experienceSummary,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        postalCode: profile.postalCode,
        linkedinUrl: profile.linkedinUrl,
        portfolioUrl: profile.portfolioUrl,
        certifications: profile.certifications?.join(", ")
      });
      setEducationItems(profile.education || []);
    }
  }, [profile, form]);

  if (isLoading) {
    return <Spin />;
  }

  function parseCsv(value: unknown): string[] {
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function handleSubmit(values: any) {
    updateMutation.mutate({
      fullName: values.fullName,
      skills: parseCsv(values.skills),
      experienceSummary: values.experienceSummary,
      phone: values.phone || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      country: values.country || null,
      postalCode: values.postalCode || null,
      linkedinUrl: values.linkedinUrl || null,
      portfolioUrl: values.portfolioUrl || null,
      education: educationItems,
      certifications: parseCsv(values.certifications)
    });
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Card title="Personal Information" className="mb-6">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[
                { required: true, message: "Please enter your full name" },
                { min: 2 }
              ]}
            >
              <Input placeholder="John Doe" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email" }
              ]}
            >
              <Input type="email" placeholder="you@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone">
              <Input type="tel" placeholder="+1 (555) 000-0000" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="address" label="Street Address">
              <Input placeholder="123 Main St" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="city" label="City">
              <Input placeholder="San Francisco" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="state" label="State">
              <Input placeholder="CA" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="country" label="Country">
              <Input placeholder="United States" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="postalCode" label="Postal Code">
              <Input placeholder="94102" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Professional" className="mb-6">
        <Form.Item
          name="skills"
          label="Top Skills (comma-separated)"
          rules={[{ required: true }]}
        >
          <Input.TextArea
            rows={2}
            placeholder="React, TypeScript, System Design"
          />
        </Form.Item>

        <Form.Item
          name="experienceSummary"
          label="Experience Summary"
          rules={[{ required: true, min: 20 }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Describe your professional experience and impact..."
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="linkedinUrl" label="LinkedIn URL">
              <Input type="url" placeholder="https://linkedin.com/in/yourprofile" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="portfolioUrl" label="Portfolio URL">
              <Input type="url" placeholder="https://yourportfolio.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="certifications" label="Certifications (comma-separated)">
          <Input.TextArea rows={2} placeholder="AWS, PMP" />
        </Form.Item>
      </Card>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={updateMutation.isPending}
          icon={<SaveOutlined />}
        >
          Save Profile
        </Button>
      </Form.Item>
    </Form>
  );
}
