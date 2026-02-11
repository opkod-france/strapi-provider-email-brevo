import * as React from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  Field,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Check, Mail } from '@strapi/icons';
import { Layouts, Page, useNotification, useFetchClient } from '@strapi/strapi/admin';
import type { FetchError } from '@strapi/strapi/admin';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PLUGIN_ID, MaskedSettings, SettingsForm, DEFAULT_SETTINGS, validateSettings } from '../../../../common';

const QUERY_KEY = [PLUGIN_ID, 'settings'];

const SettingsPage = () => {
  const { toggleNotification } = useNotification();
  const { get, put, post } = useFetchClient();
  const queryClient = useQueryClient();

  const [values, setValues] = React.useState<SettingsForm>(DEFAULT_SETTINGS);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = React.useState('');
  const [hasApiKey, setHasApiKey] = React.useState(false);

  // Fetch settings
  const { isLoading, isError, error } = useQuery<MaskedSettings, FetchError>(
    QUERY_KEY,
    async () => {
      const response = await get<MaskedSettings>(`/${PLUGIN_ID}/settings`);
      return response.data;
    },
    {
      onSuccess: (data: MaskedSettings) => {
        setHasApiKey(data.hasApiKey);
        setValues({
          ...DEFAULT_SETTINGS,
          ...data,
          apiKey: '',
        });
      },
    }
  );

  // Save settings mutation
  const saveMutation = useMutation<MaskedSettings, FetchError, SettingsForm>(
    async (payload: SettingsForm) => {
      const body: Partial<SettingsForm> = { ...payload };

      // Only send apiKey if user typed a new one
      if (!body.apiKey?.trim()) {
        delete body.apiKey;
      }

      const response = await put<MaskedSettings>(`/${PLUGIN_ID}/settings`, body);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QUERY_KEY);
        toggleNotification({
          type: 'success',
          message: 'Settings saved successfully',
        });
      },
      onError: (err: FetchError) => {
        toggleNotification({
          type: 'warning',
          message: err.message || 'Failed to save settings',
        });
      },
    }
  );

  // Test email mutation
  const testMutation = useMutation<{ success: boolean; message: string }, FetchError, string>(
    async (to: string) => {
      const response = await post<{ success: boolean; message: string }>(
        `/${PLUGIN_ID}/settings/test`,
        { to }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toggleNotification({
          type: 'success',
          message: 'Test email sent successfully',
        });
      },
      onError: (err: FetchError) => {
        toggleNotification({
          type: 'warning',
          message: err.message || 'Failed to send test email',
        });
      },
    }
  );

  const handleChange = (name: keyof SettingsForm, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For validation: if user didn't type a new key but one exists on server, skip apiKey validation
    const toValidate = {
      ...values,
      apiKey: values.apiKey.trim() || (hasApiKey ? 'existing-key-placeholder' : ''),
    };

    const validation = validateSettings(toValidate);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    saveMutation.mutate(values);
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toggleNotification({
        type: 'warning',
        message: 'Please enter a recipient email address',
      });
      return;
    }

    testMutation.mutate(testEmail);
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error message={error?.message} />;
  }

  const boxProps = {
    background: 'neutral0',
    hasRadius: true,
    shadow: 'filterShadow',
    padding: 6,
  };

  return (
    <Page.Main>
      <Page.Title>Brevo Email Settings</Page.Title>
      <form onSubmit={handleSubmit}>
        <Layouts.Header
          title="Brevo Email"
          subtitle="Configure your Brevo transactional email settings"
          primaryAction={
            <Button
              type="submit"
              startIcon={<Check />}
              loading={saveMutation.isLoading}
              disabled={saveMutation.isLoading}
            >
              Save
            </Button>
          }
        />
        <Layouts.Content>
          <Flex direction="column" gap={6}>
            {/* Enable/Disable */}
            <Box {...boxProps}>
              <Flex direction="column" alignItems="flex-start" gap={4}>
                <Typography variant="delta" tag="h2">
                  Plugin Status
                </Typography>
                <Field.Root>
                  <Field.Label>Enable Brevo Email</Field.Label>
                  <Toggle
                    checked={values.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleChange('enabled', e.target.checked);
                    }}
                    onLabel="On"
                    offLabel="Off"
                  />
                  <Field.Hint>
                    When disabled, emails will be logged to the console instead of being sent.
                  </Field.Hint>
                </Field.Root>
              </Flex>
            </Box>

            {/* API Configuration */}
            <Box {...boxProps}>
              <Flex direction="column" alignItems="flex-start" gap={4}>
                <Typography variant="delta" tag="h2">
                  API Configuration
                </Typography>
                <Grid.Root gap={4}>
                  <Grid.Item col={12}>
                    <Field.Root error={errors.apiKey}>
                      <Field.Label>Brevo API Key</Field.Label>
                      <TextInput
                        type="password"
                        name="apiKey"
                        placeholder={hasApiKey ? 'Key is configured — leave blank to keep current' : 'xkeysib-xxxxxxxxxxxx'}
                        value={values.apiKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange('apiKey', e.target.value);
                        }}
                      />
                      <Field.Hint>
                        Get your API key from the Brevo dashboard under SMTP & API settings.
                      </Field.Hint>
                      {errors.apiKey && <Field.Error>{errors.apiKey}</Field.Error>}
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Flex>
            </Box>

            {/* Email Settings */}
            <Box {...boxProps}>
              <Flex direction="column" alignItems="flex-start" gap={4}>
                <Typography variant="delta" tag="h2">
                  Email Settings
                </Typography>
                <Grid.Root gap={4}>
                  <Grid.Item col={6} xs={12}>
                    <Field.Root error={errors.defaultFrom}>
                      <Field.Label>Default From Email</Field.Label>
                      <TextInput
                        type="email"
                        name="defaultFrom"
                        placeholder="noreply@example.com"
                        value={values.defaultFrom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange('defaultFrom', e.target.value);
                        }}
                      />
                      <Field.Hint>
                        The default sender email address for outgoing emails.
                      </Field.Hint>
                      {errors.defaultFrom && <Field.Error>{errors.defaultFrom}</Field.Error>}
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={6} xs={12}>
                    <Field.Root>
                      <Field.Label>Default From Name</Field.Label>
                      <TextInput
                        type="text"
                        name="defaultFromName"
                        placeholder="My App"
                        value={values.defaultFromName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange('defaultFromName', e.target.value);
                        }}
                      />
                      <Field.Hint>
                        The default sender name displayed in emails.
                      </Field.Hint>
                    </Field.Root>
                  </Grid.Item>
                  <Grid.Item col={6} xs={12}>
                    <Field.Root error={errors.defaultReplyTo}>
                      <Field.Label>Default Reply-To Email</Field.Label>
                      <TextInput
                        type="email"
                        name="defaultReplyTo"
                        placeholder="support@example.com"
                        value={values.defaultReplyTo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange('defaultReplyTo', e.target.value);
                        }}
                      />
                      <Field.Hint>
                        The default reply-to email address (optional).
                      </Field.Hint>
                      {errors.defaultReplyTo && <Field.Error>{errors.defaultReplyTo}</Field.Error>}
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Flex>
            </Box>

            {/* Test Email */}
            {values.enabled && (
              <Box {...boxProps}>
                <Flex direction="column" alignItems="flex-start" gap={4}>
                  <Typography variant="delta" tag="h2">
                    Test Configuration
                  </Typography>
                  <Grid.Root gap={4}>
                    <Grid.Item col={8} xs={12}>
                      <Field.Root>
                        <Field.Label>Send Test Email To</Field.Label>
                        <TextInput
                          type="email"
                          name="testEmail"
                          placeholder="test@example.com"
                          value={testEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setTestEmail(e.target.value);
                          }}
                        />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={4} xs={12}>
                      <Flex height="100%" alignItems="flex-end">
                        <Button
                          variant="secondary"
                          startIcon={<Mail />}
                          loading={testMutation.isLoading}
                          disabled={testMutation.isLoading || (!values.apiKey && !hasApiKey)}
                          onClick={handleTestEmail}
                        >
                          Send Test
                        </Button>
                      </Flex>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>
              </Box>
            )}
          </Flex>
        </Layouts.Content>
      </form>
    </Page.Main>
  );
};

export default SettingsPage;
