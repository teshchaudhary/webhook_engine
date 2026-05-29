export type TenantProps = {
  id: string;
  name: string;
  secretKey: string;
  rateLimit: number;
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

  get secretKey() {
    return this.props.secretKey;
  }

  get rateLimit() {
    return this.props.rateLimit;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      secretKey: this.secretKey,
      rateLimit: this.rateLimit,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
