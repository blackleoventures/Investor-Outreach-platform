"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Result,
  Select,
  Typography,
  message,
} from "antd";
import {
  BUSINESS_MODELS,
  COUNTRIES,
  FUNDING_HISTORY_OPTIONS,
  IP_OPTIONS,
  MAX_TECHNOLOGY_WORDS,
  REVENUE_BANDS,
  SECTORS,
  STARTUP_STAGES,
  TRL_LEVELS,
  countWords,
} from "@/lib/config/deal-room-options";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface SectionProps {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ index, title, description, children }: SectionProps) {
  return (
    <Card className="mb-6 rounded-xl border-gray-200 shadow-sm" bodyStyle={{ padding: 24 }}>
      <div className="mb-6 border-b border-gray-100 pb-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Section {index}
        </Text>
        <Title level={4} style={{ margin: "4px 0 0" }}>
          {title}
        </Title>
        {description && (
          <Text type="secondary" className="text-sm">
            {description}
          </Text>
        )}
      </div>
      {children}
    </Card>
  );
}

export default function StartupApplicationPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ applicationId: string } | null>(null);
  const [techWords, setTechWords] = useState(0);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/startup-applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founder: {
            founderName: values.founderName,
            designation: values.designation,
            email: values.email,
            mobileNumber: values.mobileNumber,
            linkedinProfile: values.linkedinProfile,
          },
          startup: {
            startupName: values.startupName,
            companyWebsite: values.companyWebsite,
            country: values.country,
            incubationCentre: values.incubationCentre,
          },
          overview: {
            oneLineDescription: values.oneLineDescription,
            sector: values.sector,
            stage: values.stage,
            trl: values.trl,
            technologyDescription: values.technologyDescription,
            businessModel: values.businessModel,
          },
          traction: {
            monthlyRevenue: values.monthlyRevenue,
            payingCustomers: values.payingCustomers,
          },
          intellectualProperty: { ipTypes: values.ipTypes },
          fundraising: {
            raisingAmount: values.raisingAmount,
            currentValuation: values.currentValuation,
            previousFunding: values.previousFunding,
            useOfFunds: values.useOfFunds,
            financialHighlights: values.financialHighlights,
            grantHistory: values.grantHistory,
          },
          documents: {
            pitchDeckUrl: values.pitchDeckUrl,
            productDemoUrl: values.productDemoUrl,
          },
          declaration: {
            informationAccurate: (values.declaration || []).includes("accurate"),
            authorizeSharing: (values.declaration || []).includes("authorize"),
            understandsNoGuarantee: (values.declaration || []).includes("noGuarantee"),
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted({ applicationId: data.data.applicationId });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        message.error(data.error?.message || "Unable to submit your application.");
        if (data.error?.field) {
          form.scrollToField(data.error.field, { behavior: "smooth", block: "center" });
        }
      }
    } catch (error) {
      console.error("Application submit failed:", error);
      message.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <Card className="rounded-xl shadow-sm">
            <Result
              status="success"
              title="Application submitted"
              subTitle={
                <div className="mt-2">
                  <Paragraph className="mb-2">
                    Thank you for applying to the Black Leo Ventures Deal Room. Our team reviews
                    every application before it is shared with investors.
                  </Paragraph>
                  <Text type="secondary">Your application reference is </Text>
                  <Text strong copyable>
                    {submitted.applicationId}
                  </Text>
                  <Paragraph type="secondary" className="mt-4 text-sm">
                    A confirmation has been sent to your email address.
                  </Paragraph>
                </div>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Text className="text-xs font-bold uppercase tracking-[0.2em] text-blv-accent">
            Black Leo Ventures
          </Text>
          <Title level={2} style={{ color: "white", marginTop: 8, marginBottom: 12 }}>
            Startup Deal Room Application
          </Title>
          <Paragraph style={{ color: "#a1a1aa", marginBottom: 8 }}>
            Thank you for applying to the Black Leo Ventures Deal Room. Our Deal Room connects
            high-potential startups with investors, venture capital firms, family offices, and
            strategic partners.
          </Paragraph>
          <Paragraph style={{ color: "#a1a1aa", marginBottom: 0 }}>
            Please complete this application accurately. Fields marked{" "}
            <span className="text-blv-accent">*</span> are required.
          </Paragraph>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <Form
          form={form}
          layout="vertical"
          requiredMark
          onFinish={handleSubmit}
          scrollToFirstError={{ behavior: "smooth", block: "center" }}
          initialValues={{ payingCustomers: 0 }}
        >
          <Section index={1} title="Founder Information">
            <Form.Item
              name="founderName"
              label="Founder Name"
              rules={[{ required: true, message: "Please enter the founder's name." }]}
            >
              <Input placeholder="Full name" size="large" />
            </Form.Item>

            <Form.Item
              name="designation"
              label="Designation"
              rules={[{ required: true, message: "Please enter your designation." }]}
            >
              <Input placeholder="e.g. Founder & CEO" size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: "Please enter your email address." },
                { type: "email", message: "Please enter a valid email address." },
              ]}
            >
              <Input placeholder="founder@company.com" size="large" />
            </Form.Item>

            <Form.Item
              name="mobileNumber"
              label="Mobile Number (WhatsApp)"
              rules={[{ required: true, message: "Please enter your mobile number." }]}
            >
              <Input placeholder="+91 98765 43210" size="large" />
            </Form.Item>

            <Form.Item
              name="linkedinProfile"
              label="LinkedIn Profile"
              rules={[{ required: true, message: "Please enter your LinkedIn profile URL." }]}
            >
              <Input placeholder="https://linkedin.com/in/..." size="large" />
            </Form.Item>
          </Section>

          <Section index={2} title="Startup Information">
            <Form.Item
              name="startupName"
              label="Startup Name"
              rules={[{ required: true, message: "Please enter your startup name." }]}
            >
              <Input placeholder="Company name" size="large" />
            </Form.Item>

            <Form.Item
              name="companyWebsite"
              label="Company Website / LinkedIn"
              rules={[{ required: true, message: "Please enter your website or LinkedIn." }]}
            >
              <Input placeholder="https://yourcompany.com" size="large" />
            </Form.Item>

            <Form.Item
              name="country"
              label="Country"
              rules={[{ required: true, message: "Please select your country." }]}
            >
              <Select
                showSearch
                size="large"
                placeholder="Select country"
                optionFilterProp="label"
                options={COUNTRIES.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>

            <Form.Item
              name="incubationCentre"
              label="Incubation Centre Name"
              extra="Enter 'None' if your startup is not incubated."
              rules={[{ required: true, message: "Please enter your incubation centre or 'None'." }]}
            >
              <Input placeholder="e.g. IIT Madras Incubation Cell" size="large" />
            </Form.Item>
          </Section>

          <Section index={3} title="Startup Overview">
            <Form.Item
              name="oneLineDescription"
              label="One-Line Startup Description"
              extra="Example: AI-powered platform helping hospitals reduce diagnostic time by 70%."
              rules={[{ required: true, message: "Please enter a one-line description." }]}
            >
              <Input placeholder="What does your startup do?" size="large" maxLength={200} showCount />
            </Form.Item>

            <Form.Item
              name="sector"
              label="Which sector best describes your startup?"
              rules={[{ required: true, message: "Please select a sector." }]}
            >
              <Select
                size="large"
                placeholder="Select sector"
                options={SECTORS.map((s) => ({ label: s, value: s }))}
              />
            </Form.Item>

            <Form.Item
              name="businessModel"
              label="Business Model"
              rules={[{ required: true, message: "Please select your business model." }]}
            >
              <Select
                size="large"
                placeholder="Select business model"
                options={BUSINESS_MODELS.map((m) => ({ label: m, value: m }))}
              />
            </Form.Item>

            <Form.Item
              name="stage"
              label="Current Startup Stage"
              rules={[{ required: true, message: "Please select your current stage." }]}
            >
              <Select
                size="large"
                placeholder="Select stage"
                options={STARTUP_STAGES.map((s) => ({ label: s, value: s }))}
              />
            </Form.Item>

            <Form.Item
              name="trl"
              label="Technology Readiness Level (TRL)"
              rules={[{ required: true, message: "Please select your TRL." }]}
            >
              <Select size="large" placeholder="Select TRL" options={TRL_LEVELS} />
            </Form.Item>

            <Form.Item
              name="technologyDescription"
              label="Briefly describe your technology and explain why it is difficult to replicate."
              extra={
                <span className={techWords > MAX_TECHNOLOGY_WORDS ? "text-red-500" : undefined}>
                  {techWords} / {MAX_TECHNOLOGY_WORDS} words
                </span>
              }
              rules={[
                { required: true, message: "Please describe your technology." },
                {
                  validator: (_, value) =>
                    !value || countWords(value) <= MAX_TECHNOLOGY_WORDS
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(`Please keep this to ${MAX_TECHNOLOGY_WORDS} words or fewer.`)
                        ),
                },
              ]}
            >
              <TextArea
                rows={6}
                placeholder="Describe your core technology, your defensibility, and what makes it hard to copy."
                onChange={(e) => setTechWords(countWords(e.target.value))}
              />
            </Form.Item>
          </Section>

          <Section index={4} title="Traction">
            <Form.Item
              name="monthlyRevenue"
              label="Current Monthly Revenue"
              rules={[{ required: true, message: "Please select your revenue band." }]}
            >
              <Select
                size="large"
                placeholder="Select revenue band"
                options={REVENUE_BANDS.map((r) => ({ label: r, value: r }))}
              />
            </Form.Item>

            <Form.Item
              name="payingCustomers"
              label="Number of Paying Customers"
              rules={[{ required: true, message: "Please enter your paying customer count." }]}
            >
              <InputNumber min={0} size="large" className="w-full" placeholder="0" />
            </Form.Item>
          </Section>

          <Section index={5} title="Intellectual Property">
            <Form.Item
              name="ipTypes"
              label="Do you own or have you filed any Intellectual Property (IP)?"
              rules={[{ required: true, message: "Please select at least one option." }]}
            >
              <Checkbox.Group className="flex flex-col gap-3">
                {IP_OPTIONS.map((option) => (
                  <Checkbox key={option} value={option}>
                    {option}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          </Section>

          <Section
            index={6}
            title="Fundraising"
            description="The optional fields here appear on your investor-facing profile."
          >
            <Form.Item
              name="raisingAmount"
              label="How much are you currently raising?"
              extra="Example: USD 500,000 or Rs 5 Crore"
              rules={[{ required: true, message: "Please enter how much you are raising." }]}
            >
              <Input placeholder="USD 500,000" size="large" />
            </Form.Item>

            <Form.Item name="currentValuation" label="Current Valuation (Optional)">
              <Input placeholder="USD 3,000,000" size="large" />
            </Form.Item>

            <Form.Item
              name="previousFunding"
              label="Have you raised funding before?"
              rules={[{ required: true, message: "Please select at least one option." }]}
            >
              <Checkbox.Group className="flex flex-col gap-3">
                {FUNDING_HISTORY_OPTIONS.map((option) => (
                  <Checkbox key={option} value={option}>
                    {option}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>

            <Form.Item name="useOfFunds" label="Use of Funds (Optional)">
              <TextArea rows={4} placeholder="How will you deploy the capital you are raising?" />
            </Form.Item>

            <Form.Item name="financialHighlights" label="Financial Highlights (Optional)">
              <TextArea rows={4} placeholder="Key financial metrics: ARR, burn, runway, margins." />
            </Form.Item>

            <Form.Item name="grantHistory" label="Grant History (Optional)">
              <TextArea rows={3} placeholder="Grants awarded, awarding body, amount, and year." />
            </Form.Item>
          </Section>

          <Section index={7} title="Documents">
            <Form.Item
              name="pitchDeckUrl"
              label="Pitch Deck"
              extra="Paste a Google Drive link with 'Anyone with the link can view' enabled."
              rules={[
                { required: true, message: "Please provide a pitch deck link." },
                { type: "url", message: "Please enter a valid URL." },
              ]}
            >
              <Input placeholder="https://drive.google.com/..." size="large" />
            </Form.Item>

            <Form.Item
              name="productDemoUrl"
              label="Product Demo / Website / Video (Optional)"
              rules={[{ type: "url", message: "Please enter a valid URL." }]}
            >
              <Input placeholder="https://..." size="large" />
            </Form.Item>
          </Section>

          <Section index={8} title="Declaration">
            <Form.Item
              name="declaration"
              rules={[
                {
                  validator: (_, value) =>
                    (value || []).length === 3
                      ? Promise.resolve()
                      : Promise.reject(new Error("Please accept all three statements to submit.")),
                },
              ]}
            >
              <Checkbox.Group className="flex flex-col gap-4">
                <Checkbox value="accurate">
                  I certify that the information provided is true and accurate.
                </Checkbox>
                <Checkbox value="authorize">
                  I authorize Black Leo Ventures to share my startup profile with verified
                  investors, venture capital firms, family offices, and strategic partners.
                </Checkbox>
                <Checkbox value="noGuarantee">
                  I understand that submission of this application does not guarantee fundraising
                  or investor meetings.
                </Checkbox>
              </Checkbox.Group>
            </Form.Item>
          </Section>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            className="h-12 font-semibold"
            style={{ backgroundColor: "#4f46e5" }}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>

          <Paragraph type="secondary" className="mt-4 text-center text-xs">
            Your contact details are never shown to investors. Introductions are made only through
            the Black Leo Ventures team.
          </Paragraph>
        </Form>
      </div>
    </div>
  );
}
