import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>2021 Volkswagen Golf</CardTitle>
        <CardDescription>1.5 TSI • 32,400 miles • Manual</CardDescription>
      </CardHeader>
      <CardContent>£16,495 — one owner, full service history.</CardContent>
      <CardFooter>
        <Button size="sm">View listing</Button>
        <Button size="sm" variant="secondary">
          Save
        </Button>
      </CardFooter>
    </Card>
  ),
};
