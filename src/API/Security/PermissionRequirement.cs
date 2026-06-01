using AtlasCRM.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AtlasCRM.API.Security;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }

    public string Permission { get; }
}

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User.IsInRole(UserRole.Admin.ToString()) ||
            context.User.HasClaim(claim =>
                claim.Type == "permission" &&
                claim.Value.Equals(requirement.Permission, StringComparison.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public static class AuthorizationOptionsExtensions
{
    public static void AddPermissionPolicy(this AuthorizationOptions options, string permission)
    {
        options.AddPolicy(permission, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.AddRequirements(new PermissionRequirement(permission));
        });
    }
}
