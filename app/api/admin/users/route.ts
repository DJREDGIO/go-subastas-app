
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserType } from '@prisma/client';

// GET - Obtener usuarios pendientes de verificación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.userType !== UserType.ADMIN) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';

    let whereClause: any = {
      userType: {
        in: [UserType.POSTOR, UserType.CONCESIONARIO]
      }
    };

    if (filter === 'pending') {
      whereClause.depositPaid = true;
      whereClause.isVerified = false;
    } else if (filter === 'verified') {
      whereClause.isVerified = true;
    } else if (filter === 'unverified') {
      whereClause.isVerified = false;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        userType: true,
        depositPaid: true,
        depositAmount: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        _count: {
          select: {
            lots: true,
            bids: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Verificar usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.userType !== UserType.ADMIN) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (action === 'verify') {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: session.user.id
        }
      });

      // Crear notificación
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'BIDDER_VERIFIED',
          title: '¡Cuenta Verificada!',
          message: 'Tu cuenta ha sido verificada. Ahora puedes participar en las subastas.'
        }
      });

      return NextResponse.json({ 
        success: true, 
        user: updatedUser 
      });
    } else if (action === 'unverify') {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null
        }
      });

      return NextResponse.json({ 
        success: true, 
        user: updatedUser 
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}
