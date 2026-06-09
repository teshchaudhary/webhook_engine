export type TenantProps = {
  id: string;
  name: string;
  apiKeyHash: string;
  rateLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class Tenant {
  constructor(private readonly props: TenantProps) {}

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get apiKeyHash() {
    return this.props.apiKeyHash;
  }

  get rateLimit() {
    return this.props.rateLimit;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get isActive() {
    return this.props.isActive;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      rateLimit: this.rateLimit,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
