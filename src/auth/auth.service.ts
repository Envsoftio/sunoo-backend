import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import { LoginDto, RegisterDto, AuthResponseDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    const payload = { email: savedUser.email, sub: savedUser.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        avatar: savedUser.avatar,
      },
    };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Google OAuth methods
  async validateGoogleUser(googleUser: any): Promise<User> {
    const { email, name, avatar, providerId } = googleUser;

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Create new user with Google OAuth
      user = this.userRepository.create({
        email,
        name,
        avatar,
        password: '', // No password for OAuth users
        role: 'user', // Default role
        isEmailVerified: true, // Google emails are pre-verified
        authId: providerId,
        provider: 'google',
      });
      user = await this.userRepository.save(user);
    } else if (!user.authId) {
      // Link existing user with Google account
      user.authId = providerId;
      user.provider = 'google';
      user.avatar = avatar || user.avatar;
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async createSuperAdmin(
    email: string,
    password: string,
    name: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      role: 'superadmin',
      isEmailVerified: true,
      isActive: true,
    });

    return this.userRepository.save(superAdmin);
  }

  async updateUserRole(userId: string, role: string): Promise<User | null> {
    await this.userRepository.update(userId, { role });
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'name',
        'role',
        'isActive',
        'createdAt',
        'lastLoginAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isActive: false });
  }

  async activateUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isActive: true });
  }

  // Sunoo-compatible methods
  async handleLogin(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        return {
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'invalid_credentials',
          },
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: {
            message: 'Account is deactivated',
            code: 'account_deactivated',
          },
        };
      }

      if (!user.isEmailVerified) {
        return {
          success: false,
          error: {
            message: 'Email not verified',
            code: 'email_not_confirmed',
          },
        };
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      // Get user with subscriptions
      const userWithSubscriptions = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['subscriptions', 'subscriptions.plan'],
      });

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile: userWithSubscriptions,
          },
          session: {
            access_token: accessToken,
            refresh_token: accessToken, // For compatibility
            expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
          },
        },
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Login failed',
          code: 'login_failed',
        },
      };
    }
  }

  async handleSignup(registerDto: RegisterDto) {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        return {
          status: 409,
          message: 'Email already exists',
        };
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      const user = this.userRepository.create({
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        role: 'user',
        isEmailVerified: false, // Will be verified via email
      });

      await this.userRepository.save(user);

      return {
        status: 201,
        message: 'Signup successful',
      };
    } catch {
      return {
        status: 400,
        message: 'Signup failed',
      };
    }
  }

  handleLogout() {
    return { success: true };
  }

  async getProfile(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['subscriptions', 'subscriptions.plan'],
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'user_not_found',
          },
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to get profile',
          code: 'profile_fetch_failed',
        },
      };
    }
  }

  handleForget(_email: string) {
    // TODO: Implement email sending logic
    return {
      success: true,
      message: 'Password reset email sent',
    };
  }

  async handleUpdateUser(userId: string, updateData: any) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.userRepository.update(userId, updateData);
      return {
        success: true,
        message: 'User updated successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to update user',
          code: 'update_failed',
        },
      };
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { userId },
        relations: ['plan'],
      });

      return {
        success: true,
        data: subscriptions,
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to get subscriptions',
          code: 'subscription_fetch_failed',
        },
      };
    }
  }

  async deleteSubscription(userId: string) {
    try {
      await this.subscriptionRepository.update(
        { userId },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      return {
        success: true,
        message: 'Subscription cancelled successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to cancel subscription',
          code: 'subscription_cancel_failed',
        },
      };
    }
  }
}
